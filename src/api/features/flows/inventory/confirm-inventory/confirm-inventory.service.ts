import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { InventoryItemOutput } from 'src/domain/dto/flows';
import { Inventory, InventoryState } from 'src/domain/entities/flows';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationStatus,
  ProductItemInventoryStatus,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { ProductQuantity } from 'src/domain/interfaces';
import {
  InventoryStateInputTypeModel,
  ProductItemInventoryOutputModel,
  ProductItemInventoryState,
} from 'src/domain/interfaces/flows';
import {
  InventoryRepository,
  InventoryStateRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  AreaRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { InventoryUtilitiesService } from 'src/services/utilities';
import { ConfirmInventoryInput } from './dto';
import { AreaType, LocationDefaultType } from 'src/domain/enums/warehouses';

type ValidationResult = {
  inventory: Inventory;
  inventoryStateInputs: InventoryStateInputTypeModel[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ConfirmInventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(InventoryState)
    private readonly _inventoryStateRepository: InventoryStateRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    private readonly _inventoryUtilitiesService: InventoryUtilitiesService,
  ) {}

  async confirmInventory(
    input: ConfirmInventoryInput,
    user: UserCon,
  ): Promise<InventoryItemOutput> {
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
  ): Promise<InventoryItemOutput> {
    try {
      const { inventory, inventoryStateInputs, lang, user } = result;

      // console.log('in stock ', result.inventoryStateInputs[0].inStock);
      // console.log('counted ', result.inventoryStateInputs[0].counted);
      // console.log(
      //   'INVENTORY STATE AFTER ============= ',
      //   result.inventoryStateInputs,
      // );
      // throw new BadRequestException('debug');

      /**
       * Create inventoryStates
       */
      const inventoryStates: InventoryState[] = [];

      await Promise.all(
        inventoryStateInputs.map(async (inventoryStateInput) => {
          const { variant, inStock, counted, itemsStates } =
            inventoryStateInput;

          let inventoryState: InventoryState;

          inventoryState = await this._inventoryStateRepository.findOne({
            where: { inventoryId: inventory.id, variantId: variant.id },
          });

          if (!inventoryState) {
            inventoryState = new InventoryState();
          }

          inventoryState.variant = variant;
          inventoryState.variantId = variant.id;
          inventoryState.inventory = inventory;
          inventoryState.inventoryId = inventory.id;
          inventoryState.inStock = inStock;
          inventoryState.counted = counted;

          const itemsStatesToAdd: ProductItemInventoryState[] = [];

          itemsStates.map((itemState) => {
            const { productItem, status } = itemState;

            if (
              !itemsStatesToAdd.find(
                (itemState) => itemState.barcode === productItem.barcode,
              )
            ) {
              itemsStatesToAdd.push({ barcode: productItem.barcode, status });
            }
          });

          inventoryState.itemsStates = itemsStatesToAdd;

          inventoryStates.push(inventoryState);
        }),
      );

      await this._inventoryStateRepository.save(inventoryStates);

      /**
       * Set inventory status to PENDING
       * and save
       */
      inventory.inventoryStates = inventoryStates;
      inventory.status = OperationStatus.PENDING;
      inventory.confirmedBy = user;
      inventory.confirmedAt = new Date();

      await this._inventoryRepository.save(inventory);

      /**
       * Build the output
       */
      const inventoryOutput =
        await this._inventoryUtilitiesService.buildInventoryStatesOutput(
          inventory,
        );

      return new InventoryItemOutput(inventoryOutput, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ConfirmInventoryService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ConfirmInventoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const inventory = await this._inventoryRepository.findOne(
        input.inventoryId,
        { relations: ['location'] },
      );
      if (!inventory) {
        throw new NotFoundException(
          `Inventory you are trying to confirm is not found`,
        );
      }

      /**
       * Is user has privilege ?
       */
      const locationParents = await this._locationTreeRepository.findAncestors(
        inventory.location,
      );
      const primaryParent = locationParents.find(
        (parent) => !isNullOrWhiteSpace(parent.areaId),
      );
      const area = await this._areaRepository.findOne(primaryParent.areaId);
      const storagePoint = await this._storagePointRepository.findOne(
        area.storagePointId,
      );

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.WAREHOUSE_MANAGER,
        ) &&
        user.workStation.warehouse.reference !== storagePoint.reference
      ) {
        throw new UnauthorizedException(
          `Sorry you cannot confirm an inventory in '${storagePoint.name}' storage point because you belong to '${user.workStation.warehouse.name}'.`,
        );
      }

      /**
       * Can only confirm SAVED or PENDING inventory
       */
      if (
        inventory.status !== OperationStatus.SAVED &&
        inventory.status !== OperationStatus.PENDING
      ) {
        throw new BadRequestException(
          `You cannot confirm ${inventory.status} inventory`,
        );
      }

      // if (inventory.status !== OperationStatus.SAVED) {
      //   throw new BadRequestException(
      //     `You cannot confirm ${inventory.status} inventory`,
      //   );
      // }

      /**
       * Get all product items inside the location
       * and his children
       */
      const productItemsInLocation: ProductItem[] = [];

      const locations = await this._locationTreeRepository.findDescendants(
        inventory.location,
        { relations: ['productItems'] },
      );
      locations?.map((child) => {
        child?.productItems?.map((productItem) => {
          if (
            !productItemsInLocation.find(
              (item) => item.barcode === productItem.barcode,
            )
          ) {
            productItemsInLocation.push(productItem);
          }
        });
      });

      /**
       * inventoryStates input treatment
       */
      const inventoryStateInputs: InventoryStateInputTypeModel[] = [];
      await Promise.all(
        input.inventoryStates.map(async (inventoryState) => {
          const { variantId, inStock, counted, itemBarcodes } = inventoryState;
          const variant = await this._productVariantRepository.findOne(
            variantId,
            { relations: ['product', 'attributeValues', 'productItems'] },
          );

          if (!variant) {
            throw new NotFoundException(
              `Product variant with id ${variantId} is not found`,
            );
          }

          /**
           * Get variant product items from input
           */
          const variantItemsFromInput: ProductItem[] = [];

          // build variant counted object
          let variantCounted: ProductQuantity = {
            available: 0,
            discovered: 0,
            reserved: 0,
            inTransit: 0,
            deliveryProcessing: 0,
            awaitingSAV: 0,
            delivered: 0,
            gotOut: 0,
            pendingInvestigation: 0,
            lost: 0,
            isDead: 0,
            pendingReception: 0,
          };

          // build itemsStates
          const itemsStates: ProductItemInventoryOutputModel[] = [];

          await Promise.all(
            itemBarcodes?.map(async (itemBarcode) => {
              // console.log('HERE ================= 1');

              const variantItem = await this._productItemRepository.findOne({
                barcode: itemBarcode,
              });

              // console.log('HERE ================= 2');
              if (!variantItem) {
                throw new NotFoundException(
                  `Product with barcode '${itemBarcode}' is not found`,
                );
              }

              if (
                !variantItemsFromInput.find(
                  (item) => item.barcode === variantItem.barcode,
                )
              ) {
                variantCounted = await this._variantCounter(
                  variantItem.state,
                  variantCounted,
                );

                /**
                 * Get the input item status in location
                 * IN_SURPLUS | FOUND ?
                 */
                let status: ProductItemInventoryStatus;
                if (
                  productItemsInLocation.find(
                    (itemInLocation) =>
                      itemInLocation.barcode === variantItem.barcode,
                  )
                ) {
                  status = ProductItemInventoryStatus.FOUND;
                } else {
                  status = ProductItemInventoryStatus.IN_SURPLUS;
                }

                variantItemsFromInput.push(variantItem);
                itemsStates.push({ productItem: variantItem, status });
              }
            }),
          );

          /**
           * filter items in location by variant
           */
          const variantItemsInLocation = productItemsInLocation.filter(
            (itemInLocation) => itemInLocation.productVariantId === variant.id,
          );

          // find NOT_FOUND barcodes
          variantItemsInLocation.map((itemInLocation) => {
            if (
              !variantItemsFromInput.some(
                (variantItem) => itemInLocation.barcode === variantItem.barcode,
              )
            ) {
              itemsStates.push({
                productItem: itemInLocation,
                status: ProductItemInventoryStatus.NOT_FOUND,
              });
            }
          });

          /**
           * Calculate variant quantity in stock in current location
           */
          let variantQtyInLocation: ProductQuantity = {
            available: 0,
            discovered: 0,
            reserved: 0,
            inTransit: 0,
            deliveryProcessing: 0,
            awaitingSAV: 0,
            delivered: 0,
            gotOut: 0,
            pendingInvestigation: 0,
            lost: 0,
            isDead: 0,
            pendingReception: 0,
          };
          variant.productItems.map(async (itemInStock) => {
            if (
              locations.some(
                (location) => location.id === itemInStock.locationId,
              )
            ) {
              variantQtyInLocation = await this._variantCounter(
                itemInStock.state,
                variantQtyInLocation,
              );
            }
          });

          /**
           * Push the inventoryStateInput element
           */
          const inventoryStateInput: InventoryStateInputTypeModel = {
            variant,
            inStock: variantQtyInLocation,
            counted: variantCounted,
            itemsStates,
          };

          inventoryStateInputs.push(inventoryStateInput);
        }),
      );

      return { inventory, inventoryStateInputs, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ConfirmInventoryService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }

  private async _variantCounter(
    state: ItemState,
    counted: ProductQuantity,
  ): Promise<ProductQuantity> {
    if (state === ItemState.AVAILABLE) {
      counted.available += 1;
    }

    if (state === ItemState.DISCOVERED) {
      counted.discovered += 1;
    }

    if (state === ItemState.RESERVED) {
      counted.reserved += 1;
    }

    if (state === ItemState.IN_TRANSIT) {
      counted.inTransit += 1;
    }

    if (state === ItemState.DELIVERY_PROCESSING) {
      counted.deliveryProcessing += 1;
    }

    if (state === ItemState.AWAITING_SAV) {
      counted.awaitingSAV += 1;
    }

    if (state === ItemState.DELIVERED) {
      counted.delivered += 1;
    }

    if (state === ItemState.PENDING_INVESTIGATION) {
      counted.pendingInvestigation += 1;
    }

    if (state === ItemState.LOST) {
      counted.lost += 1;
    }

    if (state === ItemState.IS_DEAD) {
      counted.isDead += 1;
    }

    return counted;
  }
}
