import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace } from '@glosuite/shared';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import { LastSupplier } from 'src/domain/interfaces/items';
import { VariantLocalisation } from 'src/domain/interfaces/orders';
import { ProductItemRepository } from 'src/repositories/items';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { UpdatedType } from 'src/domain/enums/warehouses';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getVariantLocalisations(
    variant: ProductVariant,
  ): Promise<VariantLocalisation[]> {
    try {
      const storagePoints: StoragePoint[] = [];

      if (variant.productItems && variant.productItems.length > 0) {
        for (const productItem of variant.productItems) {
          const location = await this._locationRepository.findOne({
            where: { id: productItem.locationId },
          });

          if (!location) {
            continue;
          }

          const parents = await this._locationTreeRepository.findAncestors(
            location,
          );

          const areaId = parents.find(
            (parent) => !isNullOrWhiteSpace(parent.areaId),
          ).areaId;

          const area = await this._areaRepository.findOne({
            where: { id: areaId },
            relations: ['storagePoint'],
          });

          if (!area) {
            continue;
          }

          const storagePoint = await this._storagePointRepository.findOne({
            where: { id: area.storagePointId },
            relations: ['address'],
          });

          if (!storagePoint) {
            continue;
          }

          if (
            productItem.state === ItemState.AVAILABLE &&
            (productItem.status === StepStatus.IN_STOCK ||
              productItem.status === StepStatus.TO_STORE)
          ) {
            storagePoints.push(storagePoint);
          }
        }
      }

      const variantLocatisations: VariantLocalisation[] = [];

      storagePoints.map((storagePoint) => {
        const quantity = storagePoints.filter(
          (sp) => sp.id === storagePoint.id,
        ).length;

        if (
          !variantLocatisations.some(
            (locatisation) => locatisation.storagePoint.id === storagePoint.id,
          )
        ) {
          variantLocatisations.push({ storagePoint, quantity });
        }
      });

      const localisationsByQty = variantLocatisations.sort(
        (a, b) => b.quantity - a.quantity,
      );

      return localisationsByQty;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async getVariantAveragePurchaseCost(
    variant: ProductVariant,
  ): Promise<number> {
    try {
      let averagePurchaseCost = 0;

      const productItems = await this._productItemRepository.find({
        where: {
          productVariantId: variant.id,
        },
      });

      if (productItems && productItems.length > 0) {
        const purchaseCosts: number[] = [];

        productItems.map((productItem) =>
          purchaseCosts.push(productItem.purchaseCost),
        );

        averagePurchaseCost =
          purchaseCosts.reduce((sum, current) => sum + current, 0) /
          productItems.length;
      }

      return averagePurchaseCost;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async getLastSupplierAndPurchaseCost(
    variant: ProductVariant,
  ): Promise<LastSupplier> {
    try {
      const lastSupplier: LastSupplier = { supplier: null, purchaseCost: 0 };

      const productItems = await this._productItemRepository.find({
        where: { productVariantId: variant.id },
        relations: ['supplier'],
        order: { createdAt: 'DESC' },
      });

      if (productItems.length > 0) {
        if (productItems[0].supplier) {
          lastSupplier.supplier = productItems[0].supplier;
          lastSupplier.purchaseCost = productItems[0].purchaseCost;
        } else {
          const productItem = productItems.find(
            (productItem) => !isNullOrWhiteSpace(productItem.supplierId),
          );

          if (productItem) {
            lastSupplier.supplier = productItem.supplier;
            lastSupplier.purchaseCost = productItem.purchaseCost;
          }
        }
      }

      return lastSupplier;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  setProductQuantity(
    product: Product,
    quantity: number,
    type: UpdatedType,
    property: QuantityProprety,
  ): Product {
    switch (property) {
      case QuantityProprety.AVAILABLE:
        product.quantity.available =
          type === UpdatedType.ADD
            ? product.quantity.available + quantity
            : product.quantity.available - quantity;
        break;
      case QuantityProprety.DISCOVERED:
        product.quantity.discovered =
          type === UpdatedType.ADD
            ? product.quantity.discovered + quantity
            : product.quantity.discovered - quantity;
        break;
      case QuantityProprety.RESERVED:
        product.quantity.reserved =
          type === UpdatedType.ADD
            ? product.quantity.reserved + quantity
            : product.quantity.reserved - quantity;
        break;
      case QuantityProprety.IN_TRANSIT:
        product.quantity.inTransit =
          type === UpdatedType.ADD
            ? product.quantity.inTransit + quantity
            : product.quantity.inTransit - quantity;
        break;
      case QuantityProprety.DELIVERY_PROCESSING:
        product.quantity.deliveryProcessing =
          type === UpdatedType.ADD
            ? product.quantity.deliveryProcessing + quantity
            : product.quantity.deliveryProcessing - quantity;
        break;
      case QuantityProprety.AWAITING_SAV:
        product.quantity.awaitingSAV =
          type === UpdatedType.ADD
            ? product.quantity.awaitingSAV + quantity
            : product.quantity.awaitingSAV - quantity;
        break;
      case QuantityProprety.DELIVERED:
        product.quantity.delivered =
          type === UpdatedType.ADD
            ? product.quantity.delivered + quantity
            : product.quantity.delivered - quantity;
        break;
      case QuantityProprety.GOT_OUT:
        product.quantity.gotOut =
          type === UpdatedType.ADD
            ? product.quantity.gotOut + quantity
            : product.quantity.gotOut - quantity;
        break;
      case QuantityProprety.PENDING_INVESTIGATION:
        product.quantity.pendingInvestigation =
          type === UpdatedType.ADD
            ? product.quantity.pendingInvestigation + quantity
            : product.quantity.pendingInvestigation - quantity;
        break;
      case QuantityProprety.LOST:
        product.quantity.lost =
          type === UpdatedType.ADD
            ? product.quantity.lost + quantity
            : product.quantity.lost - quantity;
        break;
      case QuantityProprety.IS_DEAD:
        product.quantity.isDead =
          type === UpdatedType.ADD
            ? product.quantity.isDead + quantity
            : product.quantity.isDead - quantity;
        break;
      case QuantityProprety.PENDING_RECEPTION:
        product.quantity.pendingReception =
          type === UpdatedType.ADD
            ? product.quantity.pendingReception + quantity
            : product.quantity.pendingReception - quantity;
        break;
    }

    return product;
  }
}
