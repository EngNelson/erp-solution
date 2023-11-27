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
import { Reception, Transfert } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder, Supplier } from 'src/domain/entities/purchases';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  PurchaseOrderModel,
  VariantsToPurchaseModel,
} from 'src/domain/types/purchases';
import {
  ReceptionRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import {
  PurchaseOrderRepository,
  SupplierRepository,
} from 'src/repositories/purchases';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities';
import { GetPurchaseOrderByIdInput } from './dto';

@Injectable()
export class GetPurchaseOrderByIdService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getPurchaseOrderById(
    input: GetPurchaseOrderByIdInput,
    user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
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
    input: GetPurchaseOrderByIdInput,
    user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const purchaseOrder = await this._purchaseOrderRepository.findOne(
        input.purchaseOrderId,
        {
          relations: [
            'storagePoint',
            'variantPurchaseds',
            'parent',
            'child',
            'order',
            'internalNeed',
            'receptions',
            'transfert',
          ],
        },
      );

      if (!purchaseOrder) {
        throw new NotFoundException(
          `Purchase order with id '${input.purchaseOrderId}' not found`,
        );
      }

      const variantsToPurchase: VariantsToPurchaseModel[] = [];
      await Promise.all(
        purchaseOrder.variantPurchaseds.map(async (variantPurchased) => {
          const variant = await this._productVariantRepository.findOne(
            variantPurchased.variantId,
            { relations: ['product', 'attributeValues', 'children'] },
          );

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          if (variantPurchased.supplierId) {
            variantPurchased.supplier = await this._supplierRepository.findOne(
              variantPurchased.supplierId,
            );
          }

          variantsToPurchase.push({
            variantPurchased,
            variantDetails,
          });
        }),
      );

      await Promise.all(
        purchaseOrder.receptions.map(async (reception) => {
          reception.storagePoint = await this._storagePointRepository.findOne(
            reception.storagePointId,
          );

          if (reception.child) {
            reception.child = await this._receptionRepository.findOne(
              reception.child,
              { relations: ['storagePoint', 'child'] },
            );
          }

          return reception;
        }),
      );

      if (purchaseOrder.transfert) {
        purchaseOrder.transfert = await this._transfertRepository.findOne({
          where: { id: purchaseOrder.transfert.id },
          relations: ['source', 'target'],
        });
      }

      const purchaseOrderModel: PurchaseOrderModel = {
        purchaseOrder,
        variantsToPurchase,
      };

      return new PurchaseOrderItemOutput(purchaseOrderModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetPurchaseOrderByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
