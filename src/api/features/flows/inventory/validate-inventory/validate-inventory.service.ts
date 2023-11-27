import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
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
import {
  Inventory,
  Investigation,
  StockMovement,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  InvestigationStatus,
  MovementType,
  OperationStatus,
  ProductItemInventoryStatus,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
} from 'src/domain/enums/warehouses';
import {
  InventoryRepository,
  InvestigationRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { ValidateInventoryInput } from './dto';
import { ItemState } from 'src/domain/enums/items';
import { ProductQuantity } from 'src/domain/interfaces';

import {
  LocationBarcodeService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { InventoryUtilitiesService } from 'src/services/utilities';
import { InvestigationReferenceService } from 'src/services/references/flows';
import { LocationReferenceService } from 'src/services/references/warehouses';

type ValidationResult = {
  inventory: Inventory;
  storagePoint: StoragePoint;
  itemsNotFound: ProductItem[];
  itemsInSurPlus: ProductItem[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateInventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Investigation)
    private readonly _investigationRepository: InvestigationRepository,
    private readonly _locationReferenceService: LocationReferenceService,
    private readonly _locationBarcodeService: LocationBarcodeService,
    private readonly _investigationReferenceService: InvestigationReferenceService,
    private readonly _inventoryUtilitiesService: InventoryUtilitiesService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async validateInventory(
    input: ValidateInventoryInput,
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
      const {
        inventory,
        storagePoint,
        itemsNotFound,
        itemsInSurPlus,
        lang,
        user,
      } = result;

      /**
       * Inventory ajustement
       */
      const productItemsToUpdate: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const locationsToUpdate: Location[] = [];
      const investigationsToAdd: Investigation[] = [];
      const productVariantsToUpdate: ProductVariant[] = [];

      /**
       * if NOT_FOUND ?
       * 1. Move items to INVESTIGATION location
       * 2. Update locations totalItems
       * 3. Set items states to PENDING_INVESTIGATION
       * ***** and items status to TO_INVESTIGATE
       * 4. Create StockMovements
       * 5. Update product and variant quantities
       * 6. Create Investigantions with status = PENDING
       */

      if (itemsNotFound.length > 0) {
        /**
         * Check if INVESTIGATION location exist
         * If not ? create one
         */

        let defaultInvestigationLocation: Location;

        const defaultDeadStockArea = await this._areaRepository.findOneOrFail({
          where: {
            storagePointId: storagePoint.id,
            type: AreaType.DEFAULT,
            defaultType: AreaDefaultType.DEAD_STOCK,
          },
        });

        defaultInvestigationLocation = await this._locationRepository.findOne({
          areaId: defaultDeadStockArea.id,
          type: AreaType.DEFAULT,
          defaultType: LocationDefaultType.INVESTIGATION,
        });

        if (!defaultInvestigationLocation) {
          // Create default Investigation Location
          defaultInvestigationLocation = new Location();

          defaultInvestigationLocation.reference =
            await this._locationReferenceService.generate();
          defaultInvestigationLocation.type = AreaType.DEFAULT;
          defaultInvestigationLocation.defaultType =
            LocationDefaultType.INVESTIGATION;
          defaultInvestigationLocation.barCode =
            await this._locationBarcodeService.generate();
          defaultInvestigationLocation.name = `${storagePoint.name} - Investigation`;
          defaultInvestigationLocation.description = {
            fr: `Emplacement d'investigation de la zone Stock Mort de l'entrepot ${storagePoint.name}`,
            en: `Default Investigation location of Dead Stock area in ${storagePoint.name} warehouse`,
          };
          defaultInvestigationLocation.area = defaultDeadStockArea;
          defaultInvestigationLocation.areaId = defaultDeadStockArea.id;

          await this._locationRepository.save(defaultInvestigationLocation);
        }

        // let position: number = 0;
        for (const itemNotFound of itemsNotFound) {
          // 1. Move items to INVESTIGATION location
          itemNotFound.location = defaultInvestigationLocation;
          itemNotFound.locationId = defaultInvestigationLocation.id;

          // 2. Update locations totalItems
          inventory.location.totalItems -= 1;
          defaultInvestigationLocation.totalItems += 1;

          locationsToUpdate.push(inventory.location);
          locationsToUpdate.push(defaultInvestigationLocation);

          // 3. Set items states to PENDING_INVESTIGATION
          // ***** and items status to TO_INVESTIGATE
          itemNotFound.state = ItemState.PENDING_INVESTIGATION;
          itemNotFound.status = StepStatus.TO_INVESTIGATE;

          // 4. Create StockMovement
          const stockMovement = new StockMovement();

          stockMovement.movementType = MovementType.INTERNAL;
          stockMovement.triggerType = TriggerType.AUTO;
          stockMovement.triggeredBy = TriggeredBy.INVENTORY;
          stockMovement.productItem = itemNotFound;
          stockMovement.productItemId = itemNotFound.id;
          stockMovement.sourceType = StockMovementAreaType.LOCATION;
          stockMovement.targetType = StockMovementAreaType.LOCATION;
          stockMovement.sourceLocation = inventory.location;
          stockMovement.sourceLocationId = inventory.locationId;
          stockMovement.targetLocation = defaultInvestigationLocation;
          stockMovement.targetLocationId = defaultInvestigationLocation.id;
          stockMovement.inventory = inventory;
          stockMovement.inventoryId = inventory.id;

          stockMovementsToAdd.push(stockMovement);

          // 5. Update product and variant quantities
          const variant = await this._productVariantRepository.findOneOrFail(
            itemNotFound.productVariantId,
          );
          const product = await this._productRepository.findOneOrFail(
            variant.productId,
          );

          variant.quantity = await this._calculateNewQuantity(
            itemNotFound.state,
            variant.quantity,
          );
          product.quantity = await this._calculateNewQuantity(
            itemNotFound.state,
            product.quantity,
          );

          variant.quantity.pendingInvestigation += 1;
          product.quantity.pendingInvestigation += 1;
          await this._productVariantRepository.save(variant);
          await this._productRepository.save(product);

          if (
            !productVariantsToUpdate.find(
              (productVariant) => productVariant.id === variant.id,
            )
          ) {
            productVariantsToUpdate.push(variant);
          }

          // 6. Create Investigantion with status = PENDING
          const investigation = new Investigation();

          investigation.reference =
            await this._investigationReferenceService.generate(
              itemNotFound.barcode,
            );
          investigation.status = InvestigationStatus.PENDING;
          investigation.inventory = inventory;
          investigation.inventoryId = inventory.id;
          investigation.productItem = itemNotFound;

          investigationsToAdd.push(investigation);
          await this._investigationRepository.save(investigation);

          itemNotFound.investigation = investigation;

          productItemsToUpdate.push(itemNotFound);
        }
      }

      /**
       * if IN_SURPLUS ?
       * 1. Update old and new location totalItems
       * 2. Create StockMovements
       * 3. Reintegrate items on stock and set states = AVAILABLE
       * **** and items status to IN_STOCK
       * 4. Update variant and product quantities
       */
      if (itemsInSurPlus.length > 0) {
        for (const itemInSurPlus of itemsInSurPlus) {
          // 1. Update old and new location totalItems
          if (itemInSurPlus.location) {
            itemInSurPlus.location.totalItems -= 1;
            locationsToUpdate.push(itemInSurPlus.location);
          }
          inventory.location.totalItems += 1;

          locationsToUpdate.push(inventory.location);

          // 2. Create StockMovements
          const stockMovement = new StockMovement();

          stockMovement.movementType = MovementType.STOCK_ADJUSTMENT;
          stockMovement.triggerType = TriggerType.AUTO;
          stockMovement.triggeredBy = TriggeredBy.INVENTORY;
          stockMovement.productItem = itemInSurPlus;
          stockMovement.productItemId = itemInSurPlus.id;
          stockMovement.sourceType = itemInSurPlus.location
            ? StockMovementAreaType.LOCATION
            : null;
          stockMovement.targetType = StockMovementAreaType.LOCATION;
          stockMovement.sourceLocation = itemInSurPlus.location
            ? itemInSurPlus.location
            : null;
          stockMovement.sourceLocationId = itemInSurPlus.location
            ? itemInSurPlus.locationId
            : null;
          stockMovement.targetLocation = inventory.location;
          stockMovement.targetLocationId = inventory.locationId;
          stockMovement.inventory = inventory;
          stockMovement.inventoryId = inventory.id;

          stockMovementsToAdd.push(stockMovement);

          // 3. Reintegrate item on stock and set item state = AVAILABLE
          // **** and items status to IN_STOCK
          itemInSurPlus.location = inventory.location;
          itemInSurPlus.locationId = inventory.locationId;
          itemInSurPlus.state = ItemState.AVAILABLE;
          itemInSurPlus.status = StepStatus.IN_STOCK;

          // 4. Update variant and product quantities
          const variant = await this._productVariantRepository.findOneOrFail(
            itemInSurPlus.productVariantId,
          );
          const product = await this._productRepository.findOneOrFail(
            variant.productId,
          );

          variant.quantity = await this._calculateNewQuantity(
            itemInSurPlus.state,
            variant.quantity,
          );
          product.quantity = await this._calculateNewQuantity(
            itemInSurPlus.state,
            product.quantity,
          );

          await this._productVariantRepository.save(variant);
          await this._productRepository.save(product);

          if (
            !productVariantsToUpdate.find(
              (productVariant) => productVariant.id === variant.id,
            )
          ) {
            productVariantsToUpdate.push(variant);
          }

          productItemsToUpdate.push(itemInSurPlus);
        }
      }

      /**
       * Save all created and updated entities
       */
      if (locationsToUpdate.length > 0) {
        await this._locationRepository.save(locationsToUpdate);
      }

      if (stockMovementsToAdd.length > 0) {
        await this._stockMovementRepository.save(stockMovementsToAdd);

        // Add stockMovements to inventory
        inventory.stockMovements = stockMovementsToAdd;
      }

      if (productVariantsToUpdate.length > 0) {
        this._updateMagentoDataService.updateProductsQuantities(
          productVariantsToUpdate,
        );
      }

      if (investigationsToAdd.length > 0) {
        // await this._investigationRepository.save(investigationsToAdd);

        // Add investigations to inventory
        inventory.investigations = investigationsToAdd;
      }

      if (productItemsToUpdate.length > 0) {
        await this._productItemRepository.save(productItemsToUpdate);
      }

      /**
       * Set inventory status to VALIDATED
       */

      inventory.status = OperationStatus.VALIDATED;
      inventory.validatedBy = user;
      inventory.validatedAt = new Date();

      await this._inventoryRepository.save(inventory);

      /**
       * Build inventory output
       */
      const inventoryOutput =
        await this._inventoryUtilitiesService.buildInventoryStatesOutput(
          inventory,
        );

      return new InventoryItemOutput(inventoryOutput, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateInventoryService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: ValidateInventoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const inventory = await this._inventoryRepository.findOneOrFail(
        input.inventoryId,
        {
          relations: [
            'location',
            'stockMovements',
            'inventoryStates',
            'investigations',
          ],
        },
      );

      /**
       * The user must be SUPER_ADMIN, ADMIN or STORAGE_POINT_MANAGER
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
          `Sorry you are not allowed to validate an inventory`,
        );
      }

      /**
       * Can only validate PENDING inventories
       */
      if (inventory.status !== OperationStatus.PENDING) {
        throw new BadRequestException(
          `You cannot validate ${inventory.status} inventory`,
        );
      }

      const itemsNotFound: ProductItem[] = [];
      const itemsInSurPlus: ProductItem[] = [];

      await Promise.all(
        inventory.inventoryStates.map(async (inventoryState) => {
          await Promise.all(
            inventoryState.itemsStates?.map(async (itemState) => {
              const { barcode, status } = itemState;

              const productItem =
                await this._productItemRepository.findOneOrFail(
                  { barcode },
                  { relations: ['productVariant', 'location'] },
                );

              if (status === ProductItemInventoryStatus.NOT_FOUND) {
                itemsNotFound.push(productItem);
              }

              if (status === ProductItemInventoryStatus.IN_SURPLUS) {
                itemsInSurPlus.push(productItem);
              }
            }),
          );
        }),
      );

      return {
        inventory,
        storagePoint,
        itemsNotFound,
        itemsInSurPlus,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateInventoryService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }

  private async _calculateNewQuantity(
    state: ItemState,
    quantity: ProductQuantity,
  ): Promise<ProductQuantity> {
    if (state === ItemState.AVAILABLE) {
      quantity.available -= 1;
    }

    if (state === ItemState.DISCOVERED) {
      quantity.discovered -= 1;
    }

    if (state === ItemState.RESERVED) {
      quantity.reserved -= 1;
    }

    if (state === ItemState.IN_TRANSIT) {
      quantity.inTransit -= 1;
    }

    if (state === ItemState.DELIVERY_PROCESSING) {
      quantity.deliveryProcessing -= 1;
    }

    if (state === ItemState.AWAITING_SAV) {
      quantity.awaitingSAV -= 1;
    }

    if (state === ItemState.DELIVERED) {
      quantity.delivered -= 1;
    }

    if (state === ItemState.PENDING_INVESTIGATION) {
      quantity.pendingInvestigation -= 1;
    }

    if (state === ItemState.LOST) {
      quantity.lost -= 1;
    }

    if (state === ItemState.IS_DEAD) {
      quantity.isDead -= 1;
    }

    return quantity;
  }
}
