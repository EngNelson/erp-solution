import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { Reception, Transfert } from 'src/domain/entities/flows';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import {
  OperationStatus,
  ReceptionType,
  StepStatus,
} from 'src/domain/enums/flows';
import { ProductToBeStoredModel } from 'src/domain/interfaces/flows';
import {
  ReceptionRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { SharedService } from 'src/services/utilities';
import {
  GetReceptionToBeStoredByIdInput,
  GetReceptionToBeStoredByIdOutput,
} from './dto';
import { ItemState } from 'src/domain/enums/items';

@Injectable()
export class GetReceptionToBeStoredByIdService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getReceptionToBeStoredById(
    input: GetReceptionToBeStoredByIdInput,
    user: UserCon,
  ): Promise<GetReceptionToBeStoredByIdOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetReceptionToBeStoredByIdInput,
    user: UserCon,
  ): Promise<GetReceptionToBeStoredByIdOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const reception = await this._receptionRepository.findOne(
        input.receptionId,
        {
          relations: [
            'storagePoint',
            'purchaseOrder',
            'variantReceptions',
            'mobileUnits',
            'productItems',
          ],
        },
      );

      if (!reception) {
        throw new NotFoundException(`Reception not found`);
      }

      if (
        reception.status !== OperationStatus.VALIDATED &&
        reception.type !== ReceptionType.TRANSFERT
      ) {
        throw new BadRequestException(
          `The reception '${reception.reference}' is still ${reception.status}`,
        );
      }

      if (reception.purchaseOrder) {
        reception.purchaseOrder = await this._purchaseOrderRepository.findOne(
          reception.purchaseOrderId,
          {
            relations: [
              'storagePoint',
              'child',
              'parent',
              'internalNeed',
              'order',
            ],
          },
        );
      }

      let transfert: Transfert;
      if (reception.mobileUnits?.length > 0) {
        transfert = await this._transfertRepository.findOne(
          reception.mobileUnits[0].transfertId,
          { relations: ['source', 'target', 'child'] },
        );
      }

      let productsToBeStored: ProductToBeStoredModel[] = [];

      /**
       * If receptionType = TRANSFERT
       * Use mobileUnits to build the output
       */
      if (reception.type === ReceptionType.TRANSFERT) {
        const items = reception.productItems.filter(
          (productItem) => productItem.status === StepStatus.TO_STORE,
        );

        productsToBeStored = await this._buildProductToBeStoredOutput(items);
      }

      // if (reception.mobileUnits && reception.mobileUnits.length > 0) {
      //   const productItems: ProductItem[] = [];

      //   await Promise.all(
      //     reception.mobileUnits.map(async (mobileUnit) => {
      //       mobileUnit = await this._mobileUnitRepository.findOne(
      //         mobileUnit.id,
      //         { relations: ['productItems'] },
      //       );

      //       const items = mobileUnit.productItems.filter(
      //         (productItem) => productItem.status === StepStatus.TO_STORE,
      //       );

      //       productItems.push(...items);
      //     }),
      //   );

      //   productsToBeStored = await this._buildProductToBeStoredOutput(
      //     productItems,
      //   );
      // }

      /**
       * If receptionType = DELIVERY_FAILURE or CANCELED_IP or REJET_CLIENT
       * Use productItems to build the output
       */
      if (
        reception.productItems &&
        reception.productItems.length > 0 &&
        (reception.type === ReceptionType.DELIVERY_CANCELLATION ||
          reception.type === ReceptionType.INTERNAL_PROBLEM ||
          reception.type === ReceptionType.REJET_LIVRAISON)
      ) {
        const items = reception.productItems.filter(
          (productItem) => productItem.status === StepStatus.TO_STORE,
        );

        productsToBeStored = await this._buildProductToBeStoredOutput(items);
      }

      /**
       * If receptionType = PURCHASE_ORDER
       * use variantReceptions to build the output
       */
      if (
        reception.variantReceptions &&
        reception.variantReceptions.length > 0
      ) {
        await Promise.all(
          reception.variantReceptions.map(async (variantReception) => {
            const variant = await this._productVariantRepository.findOne(
              variantReception.variantId,
              { relations: ['product', 'attributeValues'] },
            );

            const variantDetails =
              await this._sharedService.buildPartialVariantOutput(variant);

            await Promise.all(
              reception.productItems.map(async (productItem) => {
                const productVariant =
                  await this._productVariantRepository.findOne(
                    productItem.productVariantId,
                  );
                productItem.productVariant = productVariant;

                return productItem;
              }),
            );

            const productItems = reception.productItems.filter(
              (productItem) =>
                productItem.productVariantId === variant.id &&
                (productItem.status === StepStatus.TO_STORE ||
                  (productItem.status === StepStatus.TO_PICK_PACK &&
                    productItem.state === ItemState.RESERVED)),
            );

            const productToBeStored: ProductToBeStoredModel = {
              variant: variantDetails,
              productItems,
              quantity: productItems.length,
            };

            if (productToBeStored.quantity > 0)
              productsToBeStored.push(productToBeStored);
          }),
        );
      }

      return new GetReceptionToBeStoredByIdOutput(
        reception,
        productsToBeStored,
        lang,
        transfert,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetReceptionToBeStoredByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _buildProductToBeStoredOutput(
    productItems: ProductItem[],
  ): Promise<ProductToBeStoredModel[]> {
    try {
      const productsToBeStored: ProductToBeStoredModel[] = [];
      const productVariants: ProductVariant[] = [];

      await Promise.all(
        productItems.map(async (item) => {
          const productVariant = await this._productVariantRepository.findOne(
            item.productVariantId,
            { relations: ['product', 'attributeValues'] },
          );

          if (
            !productVariants.some((variant) => variant.id === productVariant.id)
          ) {
            productVariants.push(productVariant);
          }
        }),
      );

      await Promise.all(
        productVariants.map(async (productVariant) => {
          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(productVariant);
          const items = productItems.filter(
            (productItem) => productItem.productVariantId === productVariant.id,
          );
          const productToBeStored: ProductToBeStoredModel = {
            variant: variantDetails,
            productItems: items,
            quantity: items.length,
          };

          productsToBeStored.push(productToBeStored);
        }),
      );

      return productsToBeStored;
    } catch (error) {
      throw new InternalServerErrorException(`An error occured: ${error}`);
    }
  }
}
