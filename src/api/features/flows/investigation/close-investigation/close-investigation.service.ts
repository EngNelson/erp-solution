import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
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
import { InvestigationItemOutput } from 'src/domain/dto/flows';
import {
  Inventory,
  Investigation,
  Reception,
  StockMovement,
  VariantReception,
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
  ReceptionType,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
} from 'src/domain/enums/warehouses';
import {
  InventoryRepository,
  InvestigationRepository,
  ReceptionRepository,
  StockMovementRepository,
  VariantReceptionRepository,
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
import { CloseInvestigationInput } from './dto';
import { ReceptionService } from 'src/services/references/flows';
import { Supplier } from 'src/domain/entities/purchases';
import { SupplierRepository } from 'src/repositories/purchases';

type ValidationResult = {
  investigation: Investigation;
  comment: string;
  newStatus: InvestigationStatus;
  storagePoint: StoragePoint;
  defaultDeadStockLocation: Location;
  defaultInvestigationLocation: Location;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CloseInvestigationService {
  constructor(
    @InjectRepository(Investigation)
    private readonly _investigationRepository: InvestigationRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
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
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    private readonly _receptionReferenceService: ReceptionService,
  ) {}

  async closeInvestigation(
    input: CloseInvestigationInput,
    user: UserCon,
  ): Promise<InvestigationItemOutput> {
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
  ): Promise<InvestigationItemOutput> {
    try {
      const {
        investigation,
        comment,
        newStatus,
        storagePoint,
        defaultDeadStockLocation,
        defaultInvestigationLocation,
        lang,
        user,
      } = result;

      /**
       * 1. Set item state to LOST and status to LOSTED
       * 2. Create stockMovement
       * ******** move item from INVESTIGATION location to
       * ******** DEAD_STOCK location
       * 3. Update product and variant quantities
       * ******** a. increase quantity.lost
       * ******** b. decrease quantity.pendingInvestigation
       * 4. Set item location to DEAD_STOCK
       * 5. Increase DEAD_STOCK location totalItems
       * 6. Decrease INVESTIGATION location totalItems
       */
      const productItem = investigation.productItem;

      // 1. Set item state to LOST and status to LOSTED
      productItem.state =
        newStatus === InvestigationStatus.CLOSED
          ? ItemState.LOST
          : ItemState.PENDING_RECEPTION;
      productItem.status =
        newStatus === InvestigationStatus.CLOSED
          ? StepStatus.LOSTED
          : StepStatus.TO_STORE;

      // 2. Create stockMovement
      const stockMovement = new StockMovement();

      stockMovement.movementType = MovementType.INTERNAL;
      stockMovement.triggerType = TriggerType.AUTO;
      stockMovement.triggeredBy = TriggeredBy.INVESTIGATION;
      stockMovement.productItem = productItem;
      stockMovement.productItemId = productItem.id;
      stockMovement.sourceType = StockMovementAreaType.LOCATION;
      stockMovement.targetType = StockMovementAreaType.LOCATION;
      stockMovement.sourceLocation = defaultInvestigationLocation;
      stockMovement.sourceLocationId = defaultInvestigationLocation.id;
      stockMovement.targetLocation = defaultDeadStockLocation;
      stockMovement.targetLocationId = defaultDeadStockLocation.id;
      stockMovement.inventory = investigation.inventory;
      stockMovement.inventoryId = investigation.inventoryId;

      await this._stockMovementRepository.save(stockMovement);

      // 3. Update product and variant quantities
      const variant = await this._productVariantRepository.findOneOrFail(
        investigation.productItem.productVariantId,
      );
      const product = await this._productRepository.findOneOrFail(
        variant.productId,
      );
      if (newStatus === InvestigationStatus.CLOSED) {
        variant.quantity.lost += 1;
        variant.quantity.pendingInvestigation -= 1;
        product.quantity.lost += 1;
        product.quantity.pendingInvestigation -= 1;
      } else {
        variant.quantity.pendingReception += 1;
        variant.quantity.pendingInvestigation -= 1;
        product.quantity.pendingReception += 1;
        product.quantity.pendingInvestigation -= 1;
      }

      await this._productVariantRepository.save(variant);
      await this._productRepository.save(product);

      // 4. Set item location to DEAD_STOCK
      productItem.location = defaultDeadStockLocation;
      productItem.locationId = defaultDeadStockLocation.id;

      // 5. Increase DEAD_STOCK location totalItems
      defaultDeadStockLocation.totalItems += 1;

      // 6. Decrease INVESTIGATION location totalItems
      defaultInvestigationLocation.totalItems -= 1;

      await this._productItemRepository.save(productItem);
      await this._locationRepository.save(defaultDeadStockLocation);
      await this._locationRepository.save(defaultInvestigationLocation);

      /**
       * Set investigation status to CLOSED
       * and add comment
       */
      investigation.status = newStatus;
      investigation.comment = comment;
      investigation.closedBy = user;
      investigation.closedAt = new Date();

      await this._investigationRepository.save(investigation);

      /**
       * If investigation is solved, create a validated reception
       * with the product item
       */
      if (newStatus === InvestigationStatus.SOLVED) {
        const reception = new Reception();

        reception.reference =
          await this._receptionReferenceService.generateReference();
        reception.type = ReceptionType.INVENTORY;
        reception.status = OperationStatus.VALIDATED;

        reception.storagePointId = storagePoint.id;
        reception.storagePoint = storagePoint;
        reception.investigation = investigation;

        reception.productItems = [productItem];

        await this._receptionRepository.save(reception);

        /**
         * Add variant received
         */
        const variantReception = new VariantReception();

        variantReception.productVariant = variant;
        variantReception.variantId = variant.id;
        variantReception.reception = reception;
        variantReception.receptionId = reception.id;
        variantReception.purchaseCost = productItem.purchaseCost;
        variantReception.quantity = 1;
        variantReception.position = 0;

        const supplier = await this._supplierRepository.findOne({
          where: { id: productItem.supplierId },
        });

        if (supplier) {
          variantReception.supplier = supplier;
          variantReception.supplierId = supplier.id;
        }

        await this._variantReceptionRepository.save(variantReception);

        reception.variantReceptions = [variantReception];
      }

      investigation.inventory = await this._inventoryRepository.findOne(
        investigation.inventoryId,
        { relations: ['location'] },
      );
      investigation.productItem = await this._productItemRepository.findOne(
        investigation.productItem.id,
        { relations: ['productVariant', 'location', 'supplier'] },
      );

      return new InvestigationItemOutput(investigation, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${CloseInvestigationService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: CloseInvestigationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (input.newStatus === InvestigationStatus.PENDING) {
        throw new BadRequestException(
          `The new status cannot be ${input.newStatus}`,
        );
      }

      const investigation = await this._investigationRepository.findOne(
        input.investigationId,
        { relations: ['inventory', 'productItem'] },
      );

      if (!investigation) {
        throw new NotFoundException(`Investigation not found`);
      }

      if (investigation.status !== InvestigationStatus.PENDING) {
        throw new BadRequestException(
          `You cannot close a ${investigation.status} investigation`,
        );
      }

      /**
       * validate comment
       */
      if (isNullOrWhiteSpace(input.comment)) {
        throw new BadRequestException(`Please provide a comment`);
      }

      /**
       * Get storage point where inventory took place
       */
      const location = await this._locationRepository.findOne(
        investigation.inventory.locationId,
      );
      const locationParents = await this._locationTreeRepository.findAncestors(
        location,
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
          `Sorry you can only close investigation of your own storage point`,
        );
      }

      /**
       * Get DEAD_STOCK and INVESTIGATION locations
       */
      const defaultDeadStockArea = await this._areaRepository.findOne({
        storagePointId: storagePoint.id,
        type: AreaType.DEFAULT,
        defaultType: AreaDefaultType.DEAD_STOCK,
      });
      const defaultDeadStockLocation = await this._locationRepository.findOne({
        areaId: defaultDeadStockArea.id,
        type: AreaType.DEFAULT,
        defaultType: LocationDefaultType.DEAD_STOCK,
      });
      const defaultInvestigationLocation =
        await this._locationRepository.findOne({
          areaId: defaultDeadStockArea.id,
          type: AreaType.DEFAULT,
          defaultType: LocationDefaultType.INVESTIGATION,
        });

      if (
        !defaultDeadStockArea ||
        !defaultDeadStockLocation ||
        !defaultInvestigationLocation
      ) {
        throw new InternalServerErrorException(
          `An error occured. Please try again`,
        );
      }

      return {
        investigation,
        comment: input.comment,
        newStatus: input.newStatus,
        storagePoint,
        defaultDeadStockLocation,
        defaultInvestigationLocation,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CloseInvestigationService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
