import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { Reception, VariantReception } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationLineState,
  OperationStatus,
  ReceptionType,
} from 'src/domain/enums/flows';
import { ProductType } from 'src/domain/enums/items';
import { ProductVariantToReceivedModel } from 'src/domain/interfaces/flows';
import {
  ReceptionModel,
  VariantsToReceivedModel,
} from 'src/domain/types/flows';
import {
  ReceptionRepository,
  VariantReceptionRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { SupplierRepository } from 'src/repositories/purchases';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { ReceptionService } from 'src/services/references/flows';
import { SharedService, UserService } from 'src/services/utilities';
import { AddReceptionInput } from './dto';
import { CommentModel } from 'src/domain/interfaces';
import { RECEPTION_MAXIMUM_QUANTITY } from 'src/domain/constants';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';

type ValidationResult = {
  storagePoint: StoragePoint;
  variantsToReceived: ProductVariantToReceivedModel[];
  comment: CommentModel;
  order: Order;
  isComment: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddReceptionService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _sharedService: SharedService,
    private readonly _userService: UserService,
  ) {}

  async addReception(
    input: AddReceptionInput,
    user: UserCon,
  ): Promise<ReceptionItemOutput> {
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
  ): Promise<ReceptionItemOutput> {
    const reception = new Reception();

    try {
      const {
        storagePoint,
        variantsToReceived,
        order,
        comment,
        isComment,
        lang,
        user,
      } = result;

      // console.log(result);

      // throw new BadRequestException('debug');

      reception.reference =
        await this._receptionReferenceService.generateReference();

      if (!!order) {
        reception.type = ReceptionType.ORDER;
        reception.order = order;
        reception.orderId = order.id;
      } else {
        reception.type = ReceptionType.AUTRE_ENTREE;
      }

      reception.status = OperationStatus.PENDING;

      reception.storagePoint = storagePoint;
      reception.storagePointId = storagePoint.id;

      if (isComment) {
        reception.comments = [comment];
      }

      reception.createdBy = user;

      await this._receptionRepository.save(reception);

      /**
       * Save variants to received
       * and build variantsToReceivedModel
       */
      const variantsToReceivedToAdd: VariantReception[] = [];
      const variantsToReceivedModel: VariantsToReceivedModel[] = [];

      let position = 0;
      variantsToReceived.map(async (variantToReceived) => {
        const { productVariant, quantity, purchaseCost, supplier } =
          variantToReceived;

        const variantReception = new VariantReception();

        variantReception.productVariant = productVariant;
        variantReception.variantId = productVariant.id;
        variantReception.reception = reception;
        variantReception.receptionId = reception.id;
        variantReception.purchaseCost = purchaseCost;
        if (supplier) {
          variantReception.supplier = supplier;
          variantReception.supplierId = supplier.id;
        }
        variantReception.quantity = quantity;
        variantReception.position = position;
        variantReception.state = OperationLineState.PENDING;
        variantReception.createdBy = user;

        variantsToReceivedToAdd.push(variantReception);

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(productVariant);

        variantsToReceivedModel.push({ variantReception, variantDetails });
        position++;
      });

      await this._variantReceptionRepository.save(variantsToReceivedToAdd);

      reception.variantReceptions = variantsToReceivedToAdd;

      await this._receptionRepository.save(reception);

      const receptionModel: ReceptionModel = {
        reception,
        mobileUnits: [],
        variantsToReceived: variantsToReceivedModel,
      };

      return new ReceptionItemOutput(receptionModel, lang);
    } catch (error) {
      console.log(error);

      if (reception.id) {
        await this._receptionRepository.delete(reception.id);
      }
      throw new ConflictException(
        `${AddReceptionService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddReceptionInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const storagePoint = await this._storagePointRepository.findOne(
        input.storagePointId,
      );
      if (!storagePoint) {
        throw new NotFoundException(`The received storage-point not found.`);
      }

      let order: Order;
      if (input.orderRef && !isNullOrWhiteSpace(input.orderRef)) {
        order = await this._orderRepository.findOne({
          where: { reference: input.orderRef },
        });

        if (!order) {
          throw new NotFoundException(
            `The order of reference ${input.orderRef} is not found`,
          );
        }
      }

      /**
       * Cannot create a reception with more than 200 items
       */
      const totalItems = input.variantsToReceived.reduce(
        (total, line) => total + line.quantity,
        0,
      );

      if (totalItems > RECEPTION_MAXIMUM_QUANTITY) {
        throw new BadRequestException(
          `Sorry, you cannot create more than ${RECEPTION_MAXIMUM_QUANTITY} items reception`,
        );
      }

      const variantsToReceived: ProductVariantToReceivedModel[] = [];

      await Promise.all(
        input.variantsToReceived.map(async (variantToReceived) => {
          const { variantId, quantity, purchaseCost, supplierId } =
            variantToReceived;

          const productVariant = await this._productVariantRepository.findOne(
            variantId,
            { relations: ['product', 'attributeValues'] },
          );

          if (!productVariant) {
            throw new NotFoundException(
              `Product variant with id ${variantId} not found`,
            );
          }

          if (productVariant.product.productType !== ProductType.SIMPLE) {
            throw new BadRequestException(
              `${getLangOrFirstAvailableValue(
                productVariant.title,
                ISOLang.FR,
              )} is a ${
                productVariant.product.productType
              } product. You cannot add it to a reception`,
            );
          }

          let supplier: Supplier;

          if (!isNullOrWhiteSpace(supplierId)) {
            supplier = await this._supplierRepository.findOne(supplierId);
            if (!supplier) {
              throw new NotFoundException(
                `Supplier with id ${supplierId} not found`,
              );
            }
          }

          if (Number.isNaN(quantity) || quantity <= 0) {
            throw new HttpException(
              `Invalid fields: quantity ${quantity}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          if (Number.isNaN(purchaseCost) || purchaseCost < 0) {
            throw new HttpException(
              `Invalid fields: purchaseCost ${purchaseCost}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const variantToReceivedItem: ProductVariantToReceivedModel = {
            productVariant,
            quantity,
            purchaseCost,
            supplier,
          };

          variantsToReceived.push(variantToReceivedItem);
        }),
      );

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
        variantsToReceived,
        comment,
        order,
        isComment: !!input.comment && !isNullOrWhiteSpace(input.comment),
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddReceptionService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
