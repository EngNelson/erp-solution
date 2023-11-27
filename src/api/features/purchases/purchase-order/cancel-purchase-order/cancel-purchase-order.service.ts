import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { PurchaseOrderItemOutput } from 'src/domain/dto/purchases';
import { ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { OperationLineState, OperationStatus } from 'src/domain/enums/flows';
import {
  PurchaseOrderModel,
  VariantsToPurchaseModel,
} from 'src/domain/types/purchases';
import { ProductVariantRepository } from 'src/repositories/items';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { SharedService } from 'src/services/utilities';
import { CancelPurchaseOrderInput } from './dto';

type ValidationResult = {
  purchaseOrder: PurchaseOrder;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelPurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async cancelPurchaseOrder(
    input: CancelPurchaseOrderInput,
    user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
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
  ): Promise<PurchaseOrderItemOutput> {
    try {
      const { purchaseOrder, lang, user } = result;

      purchaseOrder.status = OperationStatus.CANCELED;
      purchaseOrder.canceledBy = user;
      purchaseOrder.canceledAt = new Date();

      /**
       * Cancel each purchase order line
       */
      const variantsToPurchaseToCancel: VariantPurchased[] = [];
      purchaseOrder.variantPurchaseds.map((variantPurchased) => {
        variantPurchased.state = OperationLineState.CANCELED;

        variantsToPurchaseToCancel.push(variantPurchased);
      });

      await this._variantPurchasedRepository.save(variantsToPurchaseToCancel);

      await this._purchaseOrderRepository.save(purchaseOrder);

      /**
       * Build and return the output
       */
      const output = await this._purchaseOrderRepository.findOne(
        purchaseOrder.id,
        {
          relations: [
            'storagePoint',
            'variantPurchaseds',
            'parent',
            'child',
            'order',
            'internalNeed',
            'receptions',
          ],
        },
      );

      const variantsToPurchase: VariantsToPurchaseModel[] = [];
      await Promise.all(
        output.variantPurchaseds.map(async (variantPurchased) => {
          const variant = await this._productVariantRepository.findOne(
            variantPurchased.variantId,
            { relations: ['product', 'attributeValues'] },
          );

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          variantsToPurchase.push({ variantPurchased, variantDetails });
        }),
      );

      const purchaseOrderModel: PurchaseOrderModel = {
        purchaseOrder: output,
        variantsToPurchase,
      };

      return new PurchaseOrderItemOutput(purchaseOrderModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelPurchaseOrderService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: CancelPurchaseOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const purchaseOrder = await this._purchaseOrderRepository.findOne(
        input.purchaseOrderId,
        { relations: ['variantPurchaseds'] },
      );

      if (!purchaseOrder) {
        throw new NotFoundException(`Purchase order to cancel not found`);
      }

      if (purchaseOrder.status === OperationStatus.CANCELED) {
        throw new BadRequestException(
          `The reception ${purchaseOrder.reference} has already been cancelled by ${purchaseOrder.canceledBy.lastname}`,
        );
      }

      /**
       * Cannot cancel VALIDATED purchase order
       */
      if (purchaseOrder.status === OperationStatus.VALIDATED) {
        throw new BadRequestException(
          `You cannot cancel a ${OperationStatus.VALIDATED} purchase order`,
        );
      }

      return { purchaseOrder, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelPurchaseOrderService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
