import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { CustomerReturn } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  CustomerReturnState,
  CustomerReturnStatus,
  StepStatus,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { CustomerReturnRepository } from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { AddCustomerReturnInput } from './dto';
import { CustomerReturnReferenceService } from 'src/services/references/flows';
import { CommentModel } from 'src/domain/interfaces';
import { UserService } from 'src/services/utilities';

type ValidationResult = {
  storagePoint: StoragePoint;
  order: Order;
  productItems: ProductItem[];
  comment: CommentModel;
  isComment: boolean;
  isOrder: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddCustomerReturnService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _customerReturnReferenceService: CustomerReturnReferenceService,
    private readonly _userService: UserService,
  ) {}

  async addCustomerReturn(
    input: AddCustomerReturnInput,
    user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<CustomerReturnItemOutput> {
    const customerReturn = new CustomerReturn();

    try {
      const {
        storagePoint,
        order,
        productItems,
        comment,
        isComment,
        isOrder,
        lang,
        user,
      } = result;

      customerReturn.reference =
        await this._customerReturnReferenceService.generate(order);
      customerReturn.status = CustomerReturnStatus.UNRESOLVED;
      customerReturn.state = CustomerReturnState.SAVED;
      customerReturn.storagePointId = storagePoint.id;
      customerReturn.storagePoint = storagePoint;

      if (isComment) customerReturn.comments = [comment];

      if (isOrder) {
        customerReturn.orderId = order.id;
        customerReturn.order = order;
      }

      customerReturn.productItems = productItems;
      customerReturn.createdAt = new Date();
      customerReturn.createdBy = user;

      await this._customerReturnRepository.save(customerReturn);

      return new CustomerReturnItemOutput(customerReturn, lang);
    } catch (error) {
      console.log(error);

      if (customerReturn.id) {
        await this._customerReturnRepository.delete(customerReturn.id);
      }
      throw new ConflictException(
        `${AddCustomerReturnService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddCustomerReturnInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get storagePoint
       */
      const storagePoint = await this._storagePointRepository.findOne(
        input.storagePointId,
      );
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point '${input.storagePointId}' not found`,
        );
      }

      /**
       * Get order by reference
       */
      const order = await this._orderRepository.findOne({
        where: { reference: input.orderReference },
        relations: ['productItems'],
      });

      if (!order) {
        throw new NotFoundException(
          `Order '${input.orderReference}' not found`,
        );
      }

      if (
        order.orderStatus !== StepStatus.DELIVERED &&
        order.orderStatus !== StepStatus.COMPLETE
      ) {
        throw new BadRequestException(
          `You cannot create a customer return for a ${order.orderStatus} order`,
        );
      }

      /**
       * Get product items by barcodes
       * Product items validation
       */
      const productItems: ProductItem[] = [];

      await Promise.all(
        input.barcodes.map(async (barcode) => {
          const productItem = await this._productItemRepository.findOne(
            { barcode },
            { relations: ['location', 'supplier'] },
          );
          if (productItem) productItems.push(productItem);
        }),
      );

      if (productItems.length < input.barcodes.length) {
        throw new NotFoundException(`Some barcodes provided are not found`);
      }

      /**
       * Product items status and state validation
       */
      if (
        productItems.some(
          (productItem) =>
            productItem.status !== StepStatus.DELIVERED &&
            productItem.state !== ItemState.DELIVERED,
        )
      ) {
        throw new BadRequestException(
          `Some products provided have not been delivered`,
        );
      }

      /**
       * Is all barcodes provided belong to order products ?
       */
      if (
        productItems.some((productItem) => productItem.orderId !== order.id)
      ) {
        throw new NotFoundException(
          `Some products added are not in the order ${order.reference}`,
        );
      }

      let comment: CommentModel;
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comment = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };
      }

      return {
        storagePoint,
        order,
        productItems,
        comment,
        isComment: !!comment,
        isOrder: !!order,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddCustomerReturnService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
