import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inventory } from 'src/domain/entities/flows';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import {
  InventoryModel,
  InventoryStateModel,
  ProductItemInventoryOutputModel,
} from 'src/domain/interfaces/flows';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { SharedService } from './shared.service';

@Injectable()
export class InventoryUtilitiesService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async buildInventoryStatesOutput(
    inventory: Inventory,
  ): Promise<InventoryModel> {
    const inventoryStates: InventoryStateModel[] = [];

    await Promise.all(
      inventory.inventoryStates.map(async (inventoryState) => {
        inventoryState.variant = await this._productVariantRepository.findOne({
          where: { id: inventoryState.variantId },
          relations: ['product', 'attributeValues', 'productItems'],
        });

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(
            inventoryState.variant,
          );

        const itemsStates: ProductItemInventoryOutputModel[] = [];
        await Promise.all(
          inventoryState.itemsStates?.map(async (itemState) => {
            const { barcode, status } = itemState;
            const productItem = await this._productItemRepository.findOne({
              where: { barcode },
              relations: ['productVariant'],
            });

            const productItemState: ProductItemInventoryOutputModel = {
              productItem,
              status,
            };
            itemsStates.push(productItemState);
          }),
        );

        const inventoryStateItemOutput: InventoryStateModel = {
          inventoryState,
          variant: variantDetails,
          inStock: inventoryState.inStock,
          counted: inventoryState.counted,
          itemsStates,
        };

        inventoryStates.push(inventoryStateItemOutput);

        return inventoryState;
      }),
    );

    const inventoryModel: InventoryModel = { inventory, inventoryStates };

    return inventoryModel;
  }
}
