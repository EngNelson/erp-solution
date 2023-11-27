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
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import {
  MobileUnit,
  Reception,
  StockMovement,
  Transfert,
  VariantReception,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { ArticleOrdered, Order } from 'src/domain/entities/orders';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { Area, Location } from 'src/domain/entities/warehouses';
import {
  MobileUnitStatus,
  MovementType,
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StatusLine,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { OrderStep } from 'src/domain/enums/orders';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
  UpdatedType,
} from 'src/domain/enums/warehouses';
import {
  EditedVariantsToReceivedModel,
  InputVariantsReceptionQuantitiesModel,
  MobileUnitsToCompleteModel,
  ProductItemsToReceivedModel,
  VariantReceivedModel,
} from 'src/domain/interfaces/flows';
import {
  MobileUnitRepository,
  OrderProcessingRepository,
  ReceptionRepository,
  StockMovementRepository,
  TransfertRepository,
  VariantReceptionRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  ArticleOrderedRepository,
  OrderRepository,
} from 'src/repositories/orders';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import {
  AreaRepository,
  LocationRepository,
} from 'src/repositories/warehouses';

import { ValidateReceptionInput } from './dto';
import {
  LocationBarcodeService,
  OrderService,
  ProductItemBarcodeService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { ReceptionService } from 'src/services/references/flows';
import { ItemsReferenceService } from 'src/services/references/items';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';
import { RECEPTION_MAXIMUM_QUANTITY } from 'src/domain/constants';
import { EditLocationTotalItemsModel } from 'src/domain/interfaces/warehouses';

type ValidationResult = {
  reception: Reception;
  defaultReceptionLocation: Location;
  defaultPreparationLocation: Location;
  validatedVariantsToReceived: EditedVariantsToReceivedModel[];
  reportedVariantsToReceived: EditedVariantsToReceivedModel[];
  completedMobileUnitsToReceived: MobileUnitsToCompleteModel[];
  reportedMobileUnitsToReceived: MobileUnitsToCompleteModel[];
  validatedItemsToReceived: ProductItemsToReceivedModel[];
  reportedItemsToReceived: ProductItemsToReceivedModel[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateReceptionService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ArticleOrdered)
    private readonly _articleOrderedRepository: ArticleOrderedRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _itemsReferenceService: ItemsReferenceService,
    private readonly _productItemBarcodeService: ProductItemBarcodeService,
    private readonly _locationBarcodeService: LocationBarcodeService,
    private readonly _locationReferenceService: LocationReferenceService,
    private readonly _areaReferenceService: AreaReferenceService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
    private readonly _receptionService: ReceptionService,
    private readonly _orderService: OrderService,
  ) {}

  async validateReception(
    input: ValidateReceptionInput,
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
    try {
      const {
        reception,
        defaultReceptionLocation,
        defaultPreparationLocation,
        completedMobileUnitsToReceived,
        reportedMobileUnitsToReceived,
        validatedVariantsToReceived,
        reportedVariantsToReceived,
        validatedItemsToReceived,
        reportedItemsToReceived,
        lang,
        user,
      } = result;

      const variantsReceived: VariantReceivedModel[] = [];
      const variantsToEditMagentoQty: ProductVariant[] = [];
      const itemsReceived: ProductItem[] = [];

      // console.log(reception);

      /**
       * If receptionType is PURCHASE_ORDER
       * work with validatedVariantsToReceived and
       * reportedVariantsToReceived
       */
      if (
        reception.type === ReceptionType.PURCHASE_ORDER ||
        reception.type === ReceptionType.ORDER
      ) {
        /**
         * Validated variants quantities treatment
         */

        // Create items for each variant with barcodes
        for (const validatedVariant of validatedVariantsToReceived) {
          const {
            id,
            position,
            productVariant,
            newQuantity,
            newState,
            purchaseCost,
            supplier,
          } = validatedVariant;

          const productItemsToAdd: ProductItem[] = [];

          for (let i = 0; i < newQuantity; i++) {
            const productItem = new ProductItem();

            productItem.reference =
              await this._itemsReferenceService.generateItemReference();
            productItem.barcode =
              await this._productItemBarcodeService.generate();
            productItem.purchaseCost = purchaseCost;
            if (supplier) {
              productItem.supplierId = supplier.id;
              productItem.supplier = supplier;
            }

            productItem.productVariant = productVariant;
            productItem.productVariantId = productVariant.id;
            productItem.reception = reception;
            productItem.receptionId = reception.id;

            /**
             * 1. Set item status = TO_STORE
             * 2. Set item state = AVAILABLE
             * 3. Set item location = RECEPTION
             */

            /**
             * If receptionType = PURCHASE_ORDER and
             * purchaseOrder.order not empty
             * ***** Set item status = TO_PICK_PACK
             * ***** and item state = RESERVED
             */
            if (
              reception?.purchaseOrder?.order ||
              reception?.purchaseOrder?.orderRef
            ) {
              productItem.status = StepStatus.TO_PICK_PACK;
              productItem.state = ItemState.RESERVED;

              productItem.location = defaultPreparationLocation;
              productItem.locationId = defaultPreparationLocation.id;

              /**
               * Update defaultPreparationLocation
               * totalItems value
               */
              defaultPreparationLocation.totalItems += 1;
            } else {
              productItem.status = StepStatus.TO_STORE;
              productItem.state = ItemState.AVAILABLE;

              productItem.location = defaultReceptionLocation;
              productItem.locationId = defaultReceptionLocation.id;

              /**
               * Update defaultReceptionLocation
               * totalItems value
               */
              defaultReceptionLocation.totalItems += 1;
            }

            /**
             * Set variant and product quantities of each item
             */
            const productToEdit = await this._productRepository.findOne(
              productVariant.productId,
            );

            if (
              reception?.purchaseOrder?.order ||
              reception?.purchaseOrder?.orderRef
            ) {
              productToEdit.quantity.reserved += 1;
              productVariant.quantity.reserved += 1;

              if (productVariant.quantity.discovered > 0) {
                productToEdit.quantity.discovered -= 1;
                productVariant.quantity.discovered -= 1;
              }
            } else {
              productToEdit.quantity.available += 1;
              productVariant.quantity.available += 1;
            }

            productItemsToAdd.push(productItem);

            let variantReceived = variantsReceived.find(
              (variantReceived) =>
                variantReceived.variant.id === productVariant.id,
            );

            if (variantReceived) {
              variantReceived.productItems.push(productItem);
            } else {
              variantReceived = {
                variant: productVariant,
                productItems: [productItem],
              };

              variantsReceived.push(variantReceived);
            }

            await this._productRepository.save(productToEdit);
            await this._productVariantRepository.save(productVariant);
            await this._locationRepository.save(defaultReceptionLocation);
            await this._locationRepository.save(defaultPreparationLocation);

            if (
              !variantsToEditMagentoQty.find(
                (variant) => variant.id === productVariant.id,
              )
            ) {
              variantsToEditMagentoQty.push(productVariant);
            }
          }

          await this._productItemRepository.save(productItemsToAdd);

          productItemsToAdd.map((itemToAdd) => {
            if (
              !reception.productItems.find((item) => item.id === itemToAdd.id)
            ) {
              reception.productItems.push(itemToAdd);
            }
          });
          // reception.productItems = productItemsToAdd;
          itemsReceived.push(...productItemsToAdd);

          await this._receptionRepository.save(reception);

          /**
           * Create stockMovements
           */
          const stockMovementsToAdd: StockMovement[] = [];

          productItemsToAdd.map((item) => {
            /**
             * Create new stockMovements
             ******* mvtType = INT
             */
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.IN;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.RECEPTION;
            stockMovement.targetType = StockMovementAreaType.LOCATION;
            stockMovement.createdBy = user;

            stockMovement.productItem = item;
            stockMovement.productItemId = item.id;

            stockMovement.reception = reception;
            stockMovement.receptionId = reception.id;

            /**
             ******* from NULL to RECEPTION or PREPARATION location
             */
            if (
              reception?.purchaseOrder?.order ||
              reception?.purchaseOrder?.orderRef
            ) {
              stockMovement.targetLocation = defaultPreparationLocation;
              stockMovement.targetLocationId = defaultPreparationLocation.id;
            } else {
              stockMovement.targetLocation = defaultReceptionLocation;
              stockMovement.targetLocationId = defaultReceptionLocation.id;
            }

            stockMovementsToAdd.push(stockMovement);
          });

          await this._stockMovementRepository.save(stockMovementsToAdd);
        }

        /**
         * If all items needed on order available
         ****** 1. Set orderStatus = TO_PICK_PACK
         ****** 2. Set orderStep = PREPARATION_IN_PROGRESS
         ****** 3. Set each articleOrdered status = TO_PICK_PACK
         * Else if some items needed on order available
         ****** 4. Set orderStatus = TO_TREAT
         ****** 5. Set orderStep = TREATMENT_IN_PROGRESS
         */
        // if (reception?.purchaseOrder?.order) {
        //   const order = await this._orderRepository.findOne(
        //     reception.purchaseOrder.order.id,
        //     { relations: ['articleOrdereds'] },
        //   );

        //   let someAreAvailable = 0;

        //   const articleOrderedsToUpdate: ArticleOrdered[] = [];

        //   if (order.articleOrdereds && order.articleOrdereds.length > 0) {
        //     await Promise.all(
        //       order?.articleOrdereds?.map(async (articleOrdered) => {
        //         const { quantity, productVariantId, ...datas } = articleOrdered;

        //         console.log(variantsReceived);

        //         const productItems = variantsReceived.find(
        //           (item) => item.variant.id === productVariantId,
        //         ).productItems;

        //         console.log(productItems);

        //         console.log('COMPARE ', productItems.length, quantity);

        //         if (productItems.length === quantity) {
        //           const articleOrderedToUpdate =
        //             await this._articleOrderedRepository.findOne(
        //               articleOrdered.id,
        //             );

        //           articleOrderedToUpdate.status = StatusLine.TO_PICK_PACK;

        //           articleOrderedsToUpdate.push(articleOrderedToUpdate);
        //         }

        //         if (productItems.length > 0) {
        //           someAreAvailable++;
        //         }
        //       }),
        //     );
        //   }

        //   await this._articleOrderedRepository.save(articleOrderedsToUpdate);

        //   console.log(
        //     'COMPARE 2',
        //     order.articleOrdereds.length,
        //     articleOrderedsToUpdate.length,
        //   );

        //   if (
        //     order?.articleOrdereds.length === articleOrderedsToUpdate.length
        //   ) {
        //     order.orderStatus = StepStatus.TO_PICK_PACK;
        //     order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;

        //     await this._orderRepository.save(order);
        //   } else if (
        //     articleOrderedsToUpdate.length > 0 ||
        //     someAreAvailable > 0
        //   ) {
        //     order.orderStatus = StepStatus.TO_TREAT;
        //     order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;

        //     await this._orderRepository.save(order);
        //   }

        //   // update last order processing
        //   const orderProcessings = await this._orderProcessingRepository.find({
        //     where: { orderId: order.id },
        //     order: { createdAt: 'DESC' },
        //   });

        //   const lastOrderProcessing = orderProcessings[0];

        //   lastOrderProcessing.endDate = new Date();

        //   await this._orderProcessingRepository.save(lastOrderProcessing);

        //   // Create order processing
        //   const orderProcessing = new OrderProcessing();

        //   orderProcessing.reference =
        //     await this._orderReferenceService.generateOrderProcessingReference(
        //       order,
        //     );
        //   orderProcessing.state = order.orderStep;
        //   orderProcessing.status = order.orderStatus;
        //   orderProcessing.startDate = new Date();
        //   orderProcessing.orderId = order.id;
        //   orderProcessing.order = order;

        //   await this._orderProcessingRepository.save(orderProcessing);
        // }

        /**
         * Save validatedVariantsToReceived
         */
        let validatedVariantsPosition = 0;
        if (
          validatedVariantsToReceived &&
          validatedVariantsToReceived.length > 0
        ) {
          const validatedVariantsToReceivedToUpdate: VariantReception[] = [];

          await Promise.all(
            validatedVariantsToReceived.map(async (validatedVariantLine) => {
              const variantReceptionToUpdate =
                await this._variantReceptionRepository.findOne(
                  validatedVariantLine.id,
                );

              variantReceptionToUpdate.quantity =
                validatedVariantLine.newQuantity;
              variantReceptionToUpdate.purchaseCost =
                validatedVariantLine.purchaseCost;
              variantReceptionToUpdate.state = validatedVariantLine.newState;

              validatedVariantsToReceivedToUpdate.push(
                variantReceptionToUpdate,
              );
              validatedVariantsPosition++;
            }),
          );

          await this._variantReceptionRepository.save(
            validatedVariantsToReceivedToUpdate,
          );

          reception.variantReceptions.push(
            ...validatedVariantsToReceivedToUpdate,
          );
        }

        /**
         * Reported quantities treatment
         * Create child with status = PENDING and add reportedVariantsToReceived
         * with state PENDING
         */
        if (
          reportedVariantsToReceived &&
          reportedVariantsToReceived.length > 0
        ) {
          const childForReportedVariants = new Reception();

          childForReportedVariants.reference =
            await this._receptionReferenceService.generateReference(
              reception,
              true,
            );
          childForReportedVariants.type = reception.type;
          childForReportedVariants.status = OperationStatus.PENDING;
          childForReportedVariants.parent = reception;
          childForReportedVariants.storagePoint = reception.storagePoint;
          childForReportedVariants.storagePointId = reception.storagePointId;
          childForReportedVariants.purchaseOrder = reception.purchaseOrder;

          childForReportedVariants.createdBy = user;

          await this._receptionRepository.save(childForReportedVariants);

          const reportedVariantsToReceivedToAdd: VariantReception[] = [];

          reportedVariantsToReceived.map((reportedVariantLine) => {
            const {
              position,
              productVariant,
              newQuantity,
              newState,
              purchaseCost,
              supplier,
            } = reportedVariantLine;

            const newVariantReception = new VariantReception();

            newVariantReception.position = position;
            newVariantReception.quantity = newQuantity;
            newVariantReception.state = newState;

            newVariantReception.productVariant = productVariant;
            newVariantReception.variantId = productVariant.id;

            newVariantReception.reception = childForReportedVariants;
            newVariantReception.receptionId = childForReportedVariants.id;

            newVariantReception.purchaseCost = purchaseCost;
            newVariantReception.supplier = supplier;

            newVariantReception.createdBy = user;

            reportedVariantsToReceivedToAdd.push(newVariantReception);
          });

          await this._variantReceptionRepository.save(
            reportedVariantsToReceivedToAdd,
          );

          childForReportedVariants.variantReceptions =
            reportedVariantsToReceivedToAdd;
          reception.child = childForReportedVariants;

          await this._receptionRepository.save(childForReportedVariants);
        }
      }

      /**
       * If receptionType is TRANSFERT
       * work with completedMobileUnitsToReceived and reportedMobileUnitsRoReceived
       */
      if (reception.type === ReceptionType.TRANSFERT) {
        /**
         * completedMobileUnitsToReceived
         * treatment
         */

        const completedMobileUnitsToUpdate: MobileUnit[] = [];
        const mobileUnitProductItemsToUpdate: ProductItem[] = [];
        const mobileUnitArticleOrderedsToUpdate: ArticleOrdered[] = [];
        const mobileUnitOrdersToUpdate: Order[] = [];
        const mobileUnitstockMovementsToAdd: StockMovement[] = [];

        for (const completedMobileUnitLine of completedMobileUnitsToReceived) {
          const { mobileUnit, receivedItems } = completedMobileUnitLine;

          itemsReceived.push(...receivedItems);

          /**
           * If receivedItems quantity from mobile unit
           * is equal to awaiting quantity
           * Set mobile unit status = COMPLETE
           * Else status = PROCESSING
           */
          if (receivedItems.length === mobileUnit.productItems.length) {
            mobileUnit.status = MobileUnitStatus.COMPLETE;
          } else {
            mobileUnit.status = MobileUnitStatus.PROCESSING;
          }

          /**
           * 1. Remove items from mobile unit
           * ******* i.e Set item MobileUnit = NULL
           * 2. Add items to reception
           */
          for (const receivedItem of receivedItems) {
            /**
             * If transfert coming from ORDER
             * 1. Set items status = TO_PICK_PACK
             * 2. Set items state = RESERVED
             * 3. Set variant and product quantities (set reserved value)
             */

            /**
             * Get variant and product of each item
             * 1. Set variant and product quantities (set available value)
             */
            const variantToUpdate = receivedItem.productVariant;

            const productToUpdate = await this._productRepository.findOne(
              variantToUpdate.productId,
            );

            // Add
            // variantToUpdate.quantity.reserved += 1;
            // productToUpdate.quantity.reserved += 1;

            if (reception?.mobileUnits[0]?.transfert?.order) {
              receivedItem.status = StepStatus.TO_PICK_PACK;
              receivedItem.state = ItemState.RESERVED;

              // Variant
              variantToUpdate.quantity.reserved += 1;

              // Product
              productToUpdate.quantity.reserved += 1;
            } else {
              /**
               * If Transfert not coming from ORDER
               * 1. Set items status = TO_STORE
               * 2. Set items state = AVAILABLE
               */
              receivedItem.status = StepStatus.TO_STORE;
              receivedItem.state = ItemState.AVAILABLE;

              // Variant
              variantToUpdate.quantity.available += 1;

              // Product
              productToUpdate.quantity.available += 1;
            }

            // Remove
            // Variant
            variantToUpdate.quantity.inTransit -= 1;
            await this._productVariantRepository.save(variantToUpdate);

            // Product
            productToUpdate.quantity.inTransit -= 1;
            await this._productRepository.save(productToUpdate);

            if (
              !variantsToEditMagentoQty.find(
                (variant) => variant.id === variantToUpdate.id,
              )
            ) {
              variantsToEditMagentoQty.push(variantToUpdate);
            }

            // mobileUnitsVariantsToUpdate.push(variantToUpdate);
            // mobileUnitsProductsToUpdate.push(productToUpdate);

            receivedItem.mobileUnit = null;
            receivedItem.mobileUnitId = null;

            receivedItem.reception = reception;
            receivedItem.receptionId = reception.id;

            // Remove item from mobileUnit itemsScanned
            const barcodeToremoved = mobileUnit.barcodesScanned.find(
              (barcode) => barcode === receivedItem.barcode,
            );

            const barcodeIndex =
              mobileUnit.barcodesScanned.indexOf(barcodeToremoved);

            if (barcodeIndex !== -1) {
              mobileUnit.barcodesScanned.splice(barcodeIndex, 1);
            }

            if (!reception.productItems) {
              reception.productItems = [];
            }

            reception.productItems.push(receivedItem);

            /**
             * Create new stockMovement
             * ******* mvtType = INT
             */
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.IN;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.RECEPTION;
            stockMovement.createdBy = user;

            stockMovement.productItem = receivedItem;
            stockMovement.productItemId = receivedItem.id;

            stockMovement.reception = reception;
            stockMovement.receptionId = reception.id;

            stockMovement.sourceType = StockMovementAreaType.IN_TRANSIT;
            stockMovement.targetType = StockMovementAreaType.LOCATION;

            if (
              reception?.purchaseOrder?.order ||
              reception?.purchaseOrder?.orderRef
            ) {
              stockMovement.targetLocation = defaultPreparationLocation;
              stockMovement.targetLocationId = defaultPreparationLocation.id;

              /**
               * Set item location
               * Set defaultPreparationLocation totalItems
               */
              receivedItem.location = defaultPreparationLocation;
              receivedItem.locationId = defaultPreparationLocation.id;

              defaultPreparationLocation.totalItems += 1;
              await this._locationRepository.save(defaultPreparationLocation);
            } else {
              stockMovement.targetLocation = defaultReceptionLocation;
              stockMovement.targetLocationId = defaultReceptionLocation.id;

              /**
               * Set item location
               * Set defaultReceptionLocation totalItems
               */
              receivedItem.location = defaultReceptionLocation;
              receivedItem.locationId = defaultReceptionLocation.id;

              defaultReceptionLocation.totalItems += 1;
              await this._locationRepository.save(defaultReceptionLocation);
            }

            mobileUnitstockMovementsToAdd.push(stockMovement);

            mobileUnitProductItemsToUpdate.push(receivedItem);
          }

          completedMobileUnitsToUpdate.push(mobileUnit);
        }

        // console.log(completedMobileUnitsToUpdate);

        await this._mobileUnitRepository.save(completedMobileUnitsToUpdate);

        // await this._productVariantRepository.save(mobileUnitsVariantsToUpdate);

        // await this._productRepository.save(mobileUnitsProductsToUpdate);

        /**
         * reportedMobileUnitsToReceived
         * treatment
         */

        /**
         * Create a child reception and add
         * reportedMobileUnitsToReceived
         * 1. Set each mobile unit status = PROCESSING
         * 2. Set each mobile unit reception = child
         */
        // if (
        //   reportedMobileUnitsToReceived &&
        //   reportedMobileUnitsToReceived.length > 0
        // ) {
        //   const childForReportedMobileUnits = new Reception();

        //   childForReportedMobileUnits.reference =
        //     await this._receptionReferenceService.generate(reception, true);
        //   childForReportedMobileUnits.type = reception.type;
        //   childForReportedMobileUnits.status = OperationStatus.PENDING;
        //   childForReportedMobileUnits.parent = reception;
        //   childForReportedMobileUnits.storagePoint = reception.storagePoint;
        //   childForReportedMobileUnits.storagePointId = reception.storagePointId;
        //   childForReportedMobileUnits.purchaseOrder = reception.purchaseOrder;

        //   childForReportedMobileUnits.createdBy = user;

        //   await this._receptionRepository.save(childForReportedMobileUnits);

        //   const reportedMobileUnitsToUpdate: MobileUnit[] = [];

        //   await Promise.all(
        //     reportedMobileUnitsToReceived.map(async (reportedMobileUnit) => {
        //       const { mobileUnit, receivedItems } = reportedMobileUnit;

        //       mobileUnit.status = MobileUnitStatus.PROCESSING;
        //       mobileUnit.reception = childForReportedMobileUnits;
        //       mobileUnit.receptionId = childForReportedMobileUnits.id;

        //       receivedItems?.map((receivedItem) => {
        //         receivedItem.mobileUnit = mobileUnit;
        //         receivedItem.mobileUnitId = mobileUnit.id;

        //         mobileUnitProductItemsToUpdate.push(receivedItem);
        //       });

        //       mobileUnit.productItems = receivedItems;

        //       await this._mobileUnitRepository.save(mobileUnit);

        //       reportedMobileUnitsToUpdate.push(mobileUnit);
        //     }),
        //   );

        //   // await this._mobileUnitRepository.save(reportedMobileUnitsToUpdate);

        //   childForReportedMobileUnits.mobileUnits = reportedMobileUnitsToUpdate;

        //   await this._receptionRepository.save(childForReportedMobileUnits);

        //   reception.child = childForReportedMobileUnits;

        //   await this._receptionRepository.save(reception);

        //   console.log('Child ', childForReportedMobileUnits);
        // }

        await this._productItemRepository.save(mobileUnitProductItemsToUpdate);
        await this._stockMovementRepository.save(mobileUnitstockMovementsToAdd);
      }

      /**
       * If receptionType is DELIVERY_FAILURE
       * or CANCELD_IP or REJET_CLIENT
       * deal with validatedItemsToReceived
       * and reportedItemsToReceived
       */
      if (
        reception.type === ReceptionType.DELIVERY_CANCELLATION ||
        reception.type === ReceptionType.INTERNAL_PROBLEM ||
        reception.type === ReceptionType.REJET_LIVRAISON ||
        reception.type === ReceptionType.CUSTOMER_RETURN ||
        reception.type === ReceptionType.INVENTORY ||
        reception.type === ReceptionType.CANCEL_TRANSFERT
      ) {
        /**
         * validatedItemsToReceived treatment
         * For each item
         * 1. Set item status = TO_STORE
         * 2. Set item state = AVAILABLE
         * 3. Remove each item from reception
         * 4. Set product and variant quantities (available value)
         */
        const productItemsToUpdate: ProductItem[] = [];
        const articleOrderedsToUpdate: ArticleOrdered[] = [];
        const ordersToUpdate: Order[] = [];
        const stockMovementsToAdd: StockMovement[] = [];
        const locationsToEditTotalItems: EditLocationTotalItemsModel[] = [];

        for (const validatedItemLine of validatedItemsToReceived) {
          const { variant, receivedItems } = validatedItemLine;

          for (const receivedItem of receivedItems) {
            receivedItem.status = StepStatus.TO_STORE;
            receivedItem.state = ItemState.AVAILABLE;
            receivedItem.reception = null;
            receivedItem.receptionId = null;

            const productToUpdate = await this._productRepository.findOne(
              variant.productId,
            );
            variant.quantity.available += 1;
            await this._productVariantRepository.save(variant);

            productToUpdate.quantity.available += 1;
            await this._productRepository.save(productToUpdate);

            if (
              !variantsToEditMagentoQty.find(
                (productVariant) => productVariant.id === variant.id,
              )
            ) {
              variantsToEditMagentoQty.push(variant);
            }

            /**
             * Set item location
             * Set defaultReceptionLocation totalItems value
             */
            if (receivedItem.location) {
              let removeLocationLine = locationsToEditTotalItems.find(
                (line) => line.location.id === receivedItem.locationId,
              );

              if (!removeLocationLine) {
                removeLocationLine = {
                  location: receivedItem.location,
                  quantity: 1,
                  type: UpdatedType.REMOVE,
                };

                locationsToEditTotalItems.push(removeLocationLine);
              } else {
                locationsToEditTotalItems.map((line) => {
                  if (line.location.id === removeLocationLine.location.id) {
                    line.quantity += 1;
                  }

                  return line;
                });
              }
            }

            receivedItem.location = defaultReceptionLocation;
            receivedItem.locationId = defaultReceptionLocation.id;

            defaultReceptionLocation.totalItems += 1;
            await this._locationRepository.save(defaultReceptionLocation);

            /**
             * Create new stock movement
             */
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.IN;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.RECEPTION;
            stockMovement.createdBy = user;

            stockMovement.reception = reception;
            stockMovement.receptionId = reception.id;

            stockMovement.productItemId = receivedItem.id;
            stockMovement.productItem = receivedItem;

            stockMovement.targetType = StockMovementAreaType.LOCATION;

            stockMovement.targetLocation = defaultReceptionLocation;
            stockMovement.targetLocationId = defaultReceptionLocation.id;

            receivedItem.stockMovements.push(stockMovement);
            stockMovementsToAdd.push(stockMovement);
            productItemsToUpdate.push(receivedItem);
          }
        }

        await this._stockMovementRepository.save(stockMovementsToAdd);
        await this._productItemRepository.save(productItemsToUpdate);

        itemsReceived.push(...productItemsToUpdate);

        /**
         * Increase and decrease location totalItems
         */
        const locationsToEdit: Location[] = [];

        locationsToEditTotalItems.map((locationLine) => {
          const { location, quantity, type } = locationLine;

          if (type === UpdatedType.ADD && location) {
            location.totalItems += quantity;
          }

          if (type === UpdatedType.REMOVE && location) {
            location.totalItems -= quantity;
          }

          if (location) locationsToEdit.push(location);
        });

        await this._locationRepository.save(locationsToEdit);

        /**
         * Get all order with orderStatus = TO_TREAT or TO_BUY or TO_RECEIVED
         * If all items status needed on order = AVAILABLE or RESERVED
         */
        // const orders = await this._orderRepository.find({
        //   where: [
        //     { orderStatus: StepStatus.TO_TREAT },
        //     { orderStatus: StepStatus.TO_BUY },
        //     { orderStatus: StepStatus.TO_RECEIVED },
        //   ],
        // });

        // if (orders && orders.length > 0) {
        //   for (const order of orders) {
        //     for (const articleOrdered of order.articleOrdereds) {
        //       if (articleOrdered) {
        //         const { quantity, productVariantId, ...datas } = articleOrdered;

        //         // If all items status needed on order = AVAILABLE or RESERVED
        //         const variantProductItems =
        //           await this._productItemRepository.find({
        //             where: [
        //               productVariantId,
        //               { state: ItemState.AVAILABLE },
        //               { state: ItemState.RESERVED },
        //             ],
        //           });
        //         if (variantProductItems.length === quantity) {
        //           // Set each articleOrdered status = TO_PICK_PACK
        //           articleOrdered.status = StatusLine.TO_PICK_PACK;

        //           articleOrderedsToUpdate.push(articleOrdered);
        //         }
        //       }
        //     }

        //     await this._articleOrderedRepository.save(articleOrderedsToUpdate);

        //     // If all articleOrderedLine = TO_PICK_PACK
        //     if (
        //       order.articleOrdereds.length === articleOrderedsToUpdate.length
        //     ) {
        //       /**
        //        * orderStatus = TO_PICK_PACK
        //        * orderStep = TREATMENT_IN_PROGRESS
        //        */
        //       order.orderStatus = StepStatus.TO_PICK_PACK;
        //       order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;

        //       ordersToUpdate.push(order);

        //       // update last order processing
        //       const orderProcessings =
        //         await this._orderProcessingRepository.find({
        //           where: { orderId: order.id },
        //           order: { createdAt: 'DESC' },
        //         });

        //       const lastOrderProcessing = orderProcessings[0];

        //       lastOrderProcessing.endDate = new Date();

        //       await this._orderProcessingRepository.save(lastOrderProcessing);

        //       // Create order processing
        //       const orderProcessing = new OrderProcessing();

        //       orderProcessing.reference =
        //         await this._orderReferenceService.generateOrderProcessingReference(
        //           order,
        //         );
        //       orderProcessing.state = order.orderStep;
        //       orderProcessing.status = order.orderStatus;
        //       orderProcessing.startDate = new Date();
        //       orderProcessing.orderId = order.id;
        //       orderProcessing.order = order;

        //       await this._orderProcessingRepository.save(orderProcessing);
        //     }
        //   }

        //   await this._orderRepository.save(ordersToUpdate);
        // }

        /**
         * reportedItemsToReceived treatment
         * Create a child PENDING reception and add
         * reportedItemsToReceived
         * 1. item status and state remain IN_TRANSIT
         */
        if (reportedItemsToReceived && reportedItemsToReceived.length > 0) {
          const childForReportedItems = new Reception();

          childForReportedItems.reference =
            await this._receptionReferenceService.generateReference(
              reception,
              true,
            );
          childForReportedItems.type = reception.type;
          childForReportedItems.status = OperationStatus.PENDING;
          childForReportedItems.parent = reception;
          childForReportedItems.storagePoint = reception.storagePoint;
          childForReportedItems.storagePointId = reception.storagePointId;

          childForReportedItems.createdBy = user;

          await this._receptionRepository.save(childForReportedItems);

          const reportedItemsToUpdate: ProductItem[] = [];

          reportedItemsToReceived.map((reportedItemLine) => {
            const { variant, receivedItems } = reportedItemLine;

            receivedItems.map((receivedItem) => {
              receivedItem.reception = childForReportedItems;
              receivedItem.receptionId = childForReportedItems.id;

              reportedItemsToUpdate.push(receivedItem);
            });
          });

          await this._productItemRepository.save(reportedItemsToUpdate);

          childForReportedItems.productItems = reportedItemsToUpdate;

          await this._receptionRepository.save(childForReportedItems);
        }
      }

      /**
       * If receptionType is AUTRE_ENTREE
       */
      if (
        reception.type === ReceptionType.AUTRE_ENTREE ||
        reception.type === ReceptionType.UPDATED_ORDER ||
        reception.type === ReceptionType.CUSTOMER_SERVICE
      ) {
        /**
         * Validated variants quantities treatment
         */

        // Create items for each variant with barcodes
        for (const validatedVariant of validatedVariantsToReceived) {
          const {
            id,
            position,
            productVariant,
            newQuantity,
            newState,
            purchaseCost,
            supplier,
          } = validatedVariant;

          const productItemsToAdd: ProductItem[] = [];

          for (let i = 0; i < newQuantity; i++) {
            const productItem = new ProductItem();

            productItem.reference =
              await this._itemsReferenceService.generateItemReference();
            productItem.barcode =
              await this._productItemBarcodeService.generate();
            productItem.productVariant = productVariant;
            productItem.productVariantId = productVariant.id;
            productItem.reception = reception;
            productItem.receptionId = reception.id;
            productItem.purchaseCost = purchaseCost;

            if (supplier) {
              productItem.supplierId = supplier.id;
              productItem.supplier = supplier;
            }

            /**
             * 1. Set item status = TO_STORE
             * 2. Set item state = AVAILABLE
             * 3. Set item location = RECEPTION
             */

            productItem.status = StepStatus.TO_STORE;
            productItem.state = ItemState.AVAILABLE;

            productItem.location = defaultReceptionLocation;
            productItem.locationId = defaultReceptionLocation.id;

            /**
             * Update defaultReceptionLocation
             * totalItems value
             */
            defaultReceptionLocation.totalItems += 1;

            /**
             * Set variant and product quantities of each item
             */
            const productToEdit = await this._productRepository.findOne(
              productVariant.productId,
            );

            productToEdit.quantity.available += 1;
            productVariant.quantity.available += 1;

            productItemsToAdd.push(productItem);

            let variantReceived = variantsReceived.find(
              (variantReceived) =>
                variantReceived.variant.id === productVariant.id,
            );

            if (variantReceived) {
              variantReceived.productItems.push(productItem);
            } else {
              variantReceived = {
                variant: productVariant,
                productItems: [productItem],
              };

              variantsReceived.push(variantReceived);
            }

            await this._productRepository.save(productToEdit);
            await this._productVariantRepository.save(productVariant);
            await this._locationRepository.save(defaultReceptionLocation);

            if (
              !variantsToEditMagentoQty.find(
                (variant) => variant.id === productVariant.id,
              )
            ) {
              variantsToEditMagentoQty.push(productVariant);
            }
          }

          await this._productItemRepository.save(productItemsToAdd);

          productItemsToAdd.map((itemToAdd) => {
            if (
              !reception.productItems.find((item) => item.id === itemToAdd.id)
            ) {
              reception.productItems.push(itemToAdd);
            }
          });

          // reception.productItems = productItemsToAdd;
          itemsReceived.push(...productItemsToAdd);

          await this._receptionRepository.save(reception);

          /**
           * Create stockMovements
           */
          const stockMovementsToAdd: StockMovement[] = [];

          productItemsToAdd.map((item) => {
            /**
             * Create new stockMovements
             ******* mvtType = IN
             */
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.IN;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.RECEPTION;
            stockMovement.targetType = StockMovementAreaType.LOCATION;
            stockMovement.createdBy = user;

            stockMovement.productItem = item;
            stockMovement.productItemId = item.id;

            stockMovement.reception = reception;
            stockMovement.receptionId = reception.id;

            /**
             ******* from NULL to RECEPTION location
             */
            stockMovement.targetLocation = defaultReceptionLocation;
            stockMovement.targetLocationId = defaultReceptionLocation.id;

            stockMovementsToAdd.push(stockMovement);
          });

          await this._stockMovementRepository.save(stockMovementsToAdd);
        }

        /**
         * Save validatedVariantsToReceived
         */
        let validatedVariantsPosition = 0;
        if (
          validatedVariantsToReceived &&
          validatedVariantsToReceived.length > 0
        ) {
          const validatedVariantsToReceivedToUpdate: VariantReception[] = [];

          await Promise.all(
            validatedVariantsToReceived.map(async (validatedVariantLine) => {
              const variantReceptionToUpdate =
                await this._variantReceptionRepository.findOne(
                  validatedVariantLine.id,
                );

              variantReceptionToUpdate.quantity =
                validatedVariantLine.newQuantity;
              variantReceptionToUpdate.purchaseCost =
                validatedVariantLine.purchaseCost;
              variantReceptionToUpdate.state = validatedVariantLine.newState;

              validatedVariantsToReceivedToUpdate.push(
                variantReceptionToUpdate,
              );
              validatedVariantsPosition++;
            }),
          );

          await this._variantReceptionRepository.save(
            validatedVariantsToReceivedToUpdate,
          );

          reception.variantReceptions.push(
            ...validatedVariantsToReceivedToUpdate,
          );
        }

        /**
         * Reported quantities treatment
         * Create child with status = PENDING and add reportedVariantsToReceived
         * with state PENDING
         */
        if (
          reportedVariantsToReceived &&
          reportedVariantsToReceived.length > 0
        ) {
          const childForReportedVariants = new Reception();

          childForReportedVariants.reference =
            await this._receptionReferenceService.generateReference(
              reception,
              true,
            );
          childForReportedVariants.type = reception.type;
          childForReportedVariants.status = OperationStatus.PENDING;
          childForReportedVariants.parent = reception;
          childForReportedVariants.storagePoint = reception.storagePoint;
          childForReportedVariants.storagePointId = reception.storagePointId;
          childForReportedVariants.purchaseOrder = reception.purchaseOrder;

          childForReportedVariants.createdBy = user;

          await this._receptionRepository.save(childForReportedVariants);

          const reportedVariantsToReceivedToAdd: VariantReception[] = [];

          reportedVariantsToReceived.map((reportedVariantLine) => {
            const {
              position,
              productVariant,
              newQuantity,
              newState,
              purchaseCost,
              supplier,
            } = reportedVariantLine;

            const newVariantReception = new VariantReception();

            newVariantReception.position = position;
            newVariantReception.quantity = newQuantity;
            newVariantReception.state = newState;

            newVariantReception.productVariant = productVariant;
            newVariantReception.variantId = productVariant.id;

            newVariantReception.reception = childForReportedVariants;
            newVariantReception.receptionId = childForReportedVariants.id;

            newVariantReception.purchaseCost = purchaseCost;
            newVariantReception.supplier = supplier;

            newVariantReception.createdBy = user;

            reportedVariantsToReceivedToAdd.push(newVariantReception);
          });

          await this._variantReceptionRepository.save(
            reportedVariantsToReceivedToAdd,
          );

          childForReportedVariants.variantReceptions =
            reportedVariantsToReceivedToAdd;
          reception.child = childForReportedVariants;

          await this._receptionRepository.save(childForReportedVariants);
        }
      }

      if (
        !reportedMobileUnitsToReceived ||
        reportedMobileUnitsToReceived.length === 0
      ) {
        reception.status = OperationStatus.VALIDATED;
        reception.validatedBy = user;
        reception.validatedAt = new Date();
      }

      await this._locationRepository.save(defaultReceptionLocation);

      await this._receptionRepository.save(reception);

      // Check availabilities and orders treatment
      if (reception.type !== ReceptionType.CANCEL_TRANSFERT) {
        await this._orderService.setOrdersStatusAfterReception(
          itemsReceived,
          reception,
        );
      }

      // Order processing
      // if (orders && orders.length > 0) {
      //   for (const order of orders) {
      //     await this._orderService.addOrderProcessing(order);
      //   }
      // }

      // Magento stock synchronization
      this._updateMagentoDataService.updateProductsQuantities(
        variantsToEditMagentoQty,
      );

      /**
       * Build and return the output
       */

      const output = await this._receptionRepository.findOne({
        where: { reference: reception.reference },
        relations: [
          'storagePoint',
          'parent',
          'child',
          'purchaseOrder',
          'mobileUnits',
          'variantReceptions',
          'productItems',
          'order',
        ],
      });

      const receptionModel = await this._receptionService.buildReceptionOutput(
        output,
      );

      return new ReceptionItemOutput(receptionModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateReceptionService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ValidateReceptionInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the reception
       */
      const reception = await this._receptionRepository.findOne(
        input.receptionId,
        {
          relations: [
            'storagePoint',
            'parent',
            'child',
            'purchaseOrder',
            'mobileUnits',
            'variantReceptions',
            'productItems',
            'order',
          ],
        },
      );

      if (!reception) {
        throw new NotFoundException(
          `Reception you are trying to validate is not found`,
        );
      }

      // Is the reception is PENDING ?
      if (reception.status !== OperationStatus.PENDING) {
        throw new BadRequestException(
          `You cannot validate ${reception.status} reception.`,
        );
      }

      if (reception.type === ReceptionType.PURCHASE_ORDER) {
        reception.purchaseOrder = await this._purchaseOrderRepository.findOne(
          reception.purchaseOrder.id,
          { relations: ['order', 'internalNeed'] },
        );
      }

      if (reception.type === ReceptionType.TRANSFERT) {
        if (reception.mobileUnits.length > 0) {
          reception.mobileUnits.map(async (mobileUnit) => {
            mobileUnit.transfert = await this._transfertRepository.findOne({
              where: { id: mobileUnit.transfertId },
            });

            return mobileUnit;
          });
        }
      }

      /**
       * Get storage point default RECEPTION location
       * and default PREPARATION location
       */
      let defaultReceptionArea: Area;
      let defaultReceptionLocation: Location;

      defaultReceptionArea = await this._areaRepository.findOne({
        storagePointId: reception.storagePointId,
        type: AreaType.DEFAULT,
        defaultType: AreaDefaultType.RECEPTION,
      });
      if (
        !defaultReceptionArea &&
        (reception.type === ReceptionType.AUTRE_ENTREE ||
          reception.type === ReceptionType.PURCHASE_ORDER) &&
        !(
          reception.purchaseOrder.order ||
          reception.purchaseOrder.internalNeed ||
          reception.purchaseOrder.orderRef
        )
      ) {
        // Create defaultReceptionArea
        defaultReceptionArea = new Area();

        defaultReceptionArea.reference =
          await this._areaReferenceService.generate();
        defaultReceptionArea.type = AreaType.DEFAULT;
        defaultReceptionArea.defaultType = AreaDefaultType.RECEPTION;
        defaultReceptionArea.title = `${reception.storagePoint.name} - Reception`;
        defaultReceptionArea.description = {
          fr: `Zone de reception de l'entrepot ${reception.storagePoint.name}`,
          en: `${reception.storagePoint.name} reception area`,
        };
        defaultReceptionArea.storagePoint = reception.storagePoint;
        defaultReceptionArea.storagePointId = reception.storagePointId;

        await this._areaRepository.save(defaultReceptionArea);
      }

      defaultReceptionLocation = await this._locationRepository.findOne({
        areaId: defaultReceptionArea.id,
        type: AreaType.DEFAULT,
        defaultType: LocationDefaultType.RECEPTION,
      });
      if (
        !defaultReceptionLocation &&
        (reception.type === ReceptionType.AUTRE_ENTREE ||
          reception.type === ReceptionType.PURCHASE_ORDER) &&
        !(
          reception.purchaseOrder.order ||
          reception.purchaseOrder.internalNeed ||
          reception.purchaseOrder.orderRef
        )
      ) {
        // Create defaultReceptionLocation
        defaultReceptionLocation = new Location();

        defaultReceptionLocation.reference =
          await this._locationReferenceService.generate();
        defaultReceptionLocation.type = AreaType.DEFAULT;
        defaultReceptionLocation.defaultType = LocationDefaultType.RECEPTION;
        defaultReceptionLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultReceptionLocation.name = `${reception.storagePoint.name} - Reception`;
        defaultReceptionLocation.description = {
          fr: `Emplacement de reception de la zone de reception dans l'entrepot ${reception.storagePoint.name}`,
          en: `Default Reception location of reception area in ${reception.storagePoint.name} warehouse`,
        };
        defaultReceptionLocation.area = defaultReceptionArea;
        defaultReceptionLocation.areaId = defaultReceptionArea.id;

        await this._locationRepository.save(defaultReceptionLocation);
      }

      // Get or create default preparation location
      let defaultPreparationArea: Area;
      let defaultPreparationLocation: Location;

      defaultPreparationArea = await this._areaRepository.findOne({
        where: {
          storagePointId: reception.storagePointId,
          type: AreaType.DEFAULT,
          defaultType: AreaDefaultType.PREPARATION,
        },
      });

      if (
        !defaultPreparationArea &&
        reception.type === ReceptionType.PURCHASE_ORDER &&
        !(
          reception.purchaseOrder.order ||
          reception.purchaseOrder.orderRef ||
          reception.purchaseOrder.internalNeed
        )
      ) {
        // Create default preparation area
        defaultPreparationArea = new Area();

        defaultPreparationArea.reference =
          await this._areaReferenceService.generate();
        defaultPreparationArea.type = AreaType.DEFAULT;
        defaultPreparationArea.defaultType = AreaDefaultType.PREPARATION;
        defaultPreparationArea.title = `${reception.storagePoint.name} - Preparation`;
        defaultPreparationArea.description = {
          fr: `Zone de reception de l'entrepot ${reception.storagePoint.name}`,
          en: `${reception.storagePoint.name} preparation area`,
        };
        defaultPreparationArea.storagePoint = reception.storagePoint;
        defaultPreparationArea.storagePointId = reception.storagePointId;

        await this._areaRepository.save(defaultPreparationArea);
      }

      defaultPreparationLocation = await this._locationRepository.findOne({
        where: {
          areaId: defaultPreparationArea.id,
          type: AreaType.DEFAULT,
          defaultType: LocationDefaultType.PREPARATION,
        },
      });

      if (
        !defaultPreparationLocation &&
        reception.type === ReceptionType.PURCHASE_ORDER &&
        !(
          reception.purchaseOrder.order ||
          reception.purchaseOrder.orderRef ||
          reception.purchaseOrder.internalNeed
        )
      ) {
        // Create default preparation location
        defaultPreparationLocation = new Location();

        defaultPreparationLocation.reference =
          await this._locationReferenceService.generate();
        defaultPreparationLocation.type = AreaType.DEFAULT;
        defaultPreparationLocation.defaultType =
          LocationDefaultType.PREPARATION;
        defaultPreparationLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultPreparationLocation.name = `${reception.storagePoint.name} - Preparation`;
        defaultPreparationLocation.description = {
          fr: `Emplacement de preparation de la zone de preparation dans l'entrepot ${reception.storagePoint.name}`,
          en: `Default preparation location of preparation area in ${reception.storagePoint.name} warehouse`,
        };
        defaultPreparationLocation.area = defaultPreparationArea;
        defaultPreparationLocation.areaId = defaultPreparationArea.id;

        await this._locationRepository.save(defaultPreparationLocation);
      }

      const validatedVariantsToReceived: EditedVariantsToReceivedModel[] = [];
      const reportedVariantsToReceived: EditedVariantsToReceivedModel[] = [];
      const completedMobileUnitsToReceived: MobileUnitsToCompleteModel[] = [];
      const reportedMobileUnitsToReceived: MobileUnitsToCompleteModel[] = [];
      const validatedItemsToReceived: ProductItemsToReceivedModel[] = [];
      const reportedItemsToReceived: ProductItemsToReceivedModel[] = [];

      /**
       * If receptionType is TRANSFERT
       * mobileUnitsToComplete[] are required
       */
      if (reception.type === ReceptionType.TRANSFERT) {
        /**
         * mobileUnitsToComplete validation
         */
        if (
          !input.mobileUnitsToComplete ||
          input.mobileUnitsToComplete.length === 0
        ) {
          throw new BadRequestException(
            `Cannot validate ${ReceptionType.TRANSFERT} reception with no completed mobile unit`,
          );
        }

        await Promise.all(
          input.mobileUnitsToComplete.map(async (mobileUnitInput) => {
            const { mobileUnitId, receivedItemBarcodes } = mobileUnitInput;

            const mobileUnit = await this._mobileUnitRepository.findOne(
              mobileUnitId,
              { relations: ['productItems', 'transfert'] },
            );
            if (!mobileUnit) {
              throw new NotFoundException(
                `The mobile unit with id ${mobileUnitId} is not found`,
              );
            }

            // If the mobile unit belong to the reception
            if (
              !reception.mobileUnits.some((unit) => unit.id === mobileUnit.id)
            ) {
              throw new BadRequestException(
                `The mobile unit ${mobileUnit.reference} is not in this reception`,
              );
            }

            /**
             * Get received items
             */
            const receivedItemIds: string[] = [];
            await Promise.all(
              receivedItemBarcodes.map(async (barcode) => {
                receivedItemIds.push(
                  (await this._productItemRepository.findOne({ barcode })).id,
                );
              }),
            );

            const receivedItems = await this._productItemRepository.findByIds(
              receivedItemIds,
              { relations: ['productVariant'] },
            );
            if (receivedItems.length < receivedItemBarcodes.length) {
              throw new NotFoundException(`Some product items are not found`);
            }

            if (
              receivedItems.some(
                (receivedItem) => receivedItem.mobileUnitId !== mobileUnit.id,
              )
            ) {
              throw new BadRequestException(
                `Some product items provided are not in the mobile unit ${mobileUnit.reference}`,
              );
            }

            /**
             * Build complete mobile-units and
             * reported mobile-units
             */
            const mobileUnitReportedItems: ProductItem[] = [];

            mobileUnit.productItems.map((item) => {
              if (
                !receivedItems.find(
                  (receivedItem) => receivedItem.id === item.id,
                )
              ) {
                mobileUnitReportedItems.push(item);
              }
            });

            if (mobileUnitReportedItems.length > 0) {
              const reportedMobileUnitsModel: MobileUnitsToCompleteModel = {
                mobileUnit,
                receivedItems: mobileUnitReportedItems,
              };
              reportedMobileUnitsToReceived.push(reportedMobileUnitsModel);
            }

            const completedMobileUnitsModel: MobileUnitsToCompleteModel = {
              mobileUnit,
              receivedItems,
            };
            completedMobileUnitsToReceived.push(completedMobileUnitsModel);
          }),
        );
      }

      /**
       * If receptionType is PURCHASE_ORDER or AUTRE_ENTREE
       * validatedVariantsToReceived[] are required
       */
      if (
        reception.type === ReceptionType.PURCHASE_ORDER ||
        reception.type === ReceptionType.AUTRE_ENTREE ||
        reception.type === ReceptionType.CUSTOMER_SERVICE ||
        reception.type === ReceptionType.UPDATED_ORDER ||
        reception.type === ReceptionType.ORDER
      ) {
        /**
         * validatedVariantsToReceived validation
         */
        if (
          !input.validatedVariantsToReceived ||
          input.validatedVariantsToReceived.length === 0
        ) {
          throw new BadRequestException(
            `Cannot validate ${reception.type} reception with empty lines`,
          );
        }

        /**
         * Are all reception lines taking in consideration
         */
        if (
          input.validatedVariantsToReceived.length <
          reception.variantReceptions.length
        ) {
          throw new BadRequestException(`Some reception lines are missing`);
        }

        /**
         * If all reception lines are canceled
         */
        const isSomeLinesNotCanceled = input.validatedVariantsToReceived.some(
          (line) => line.newState !== OperationLineState.CANCELED,
        );

        if (!isSomeLinesNotCanceled) {
          throw new BadRequestException(
            `You cannot validate reception with all lines canceled`,
          );
        }

        /**
         * Validate variants quantities
         */
        const inputVariantsReceptionQuantities: InputVariantsReceptionQuantitiesModel[] =
          [];

        input.validatedVariantsToReceived.map((inputReceivedLine) => {
          const { variantReceptionId, newQuantity, newState } =
            inputReceivedLine;

          const inputReceptionItem: InputVariantsReceptionQuantitiesModel = {
            variantReceptionId: variantReceptionId,
            inputQuantity: newQuantity,
          };

          inputVariantsReceptionQuantities.push(inputReceptionItem);
        });

        reception.variantReceptions.map((variantReception) => {
          const inputVariants = inputVariantsReceptionQuantities.filter(
            (inputVariant) =>
              inputVariant.variantReceptionId === variantReception.id,
          );

          /**
           * Get total input quantity
           */
          let totalInputQty = 0;
          inputVariants.map((item) => (totalInputQty += item.inputQuantity));

          if (totalInputQty < variantReception.quantity) {
            throw new BadRequestException(
              `Some input lines variants quantities are less than awaiting quantities`,
            );
          }
        });

        /**
         * Build validatedVariantsToReceived[] and
         * reportedVariantsToReceived[]
         */
        let reportedPosition = 0;
        await Promise.all(
          input.validatedVariantsToReceived.map(async (inputReceptionLine) => {
            const { variantReceptionId, newQuantity, purchaseCost, newState } =
              inputReceptionLine;

            const receptionLine =
              await this._variantReceptionRepository.findOne(
                variantReceptionId,
                { relations: ['productVariant', 'supplier'] },
              );

            const variant = await this._productVariantRepository.findOne(
              receptionLine?.variantId,
              { relations: ['product', 'attributeValues'] },
            );

            if (!receptionLine || !variant) {
              throw new NotFoundException(
                `The variant ${getLangOrFirstAvailableValue(
                  variant.title,
                  lang,
                )} is not found in reception lines`,
              );
            }

            /**
             * Quantity validation
             * Is newQuantity <= quantity ?
             */
            if (newQuantity > receptionLine.quantity) {
              throw new BadRequestException(
                `You cannot validate a variant quantity greater than awaiting one`,
              );
            }

            /**
             * Line treatment
             * A line cannot remain PENDING
             */
            if (newState === OperationLineState.PENDING) {
              throw new BadRequestException(
                `A reception line cannot remain ${OperationLineState.PENDING}`,
              );
            }

            /**
             * If reception line state = VALIDATED
             * Check the quantity and treat the line
             */
            if (newState === OperationLineState.VALIDATED) {
              const validatedReceptionLine: EditedVariantsToReceivedModel = {
                id: receptionLine.id,
                position: receptionLine.position,
                productVariant: variant,
                newQuantity,
                newState: OperationLineState.VALIDATED,
                purchaseCost: purchaseCost
                  ? purchaseCost
                  : receptionLine.purchaseCost,
                supplier: receptionLine.supplier,
              };

              validatedVariantsToReceived.push(validatedReceptionLine);
            }

            /**
             * If reception line state = REPORTED
             */
            if (newState === OperationLineState.REPORTED) {
              const reportedReceptionLine: EditedVariantsToReceivedModel = {
                position: reportedPosition,
                productVariant: variant,
                newQuantity,
                newState: OperationLineState.PENDING,
                purchaseCost: purchaseCost
                  ? purchaseCost
                  : receptionLine.purchaseCost,
                supplier: receptionLine.supplier,
              };

              reportedVariantsToReceived.push(reportedReceptionLine);
              reportedPosition++;
            }
          }),
        );
      }

      /**
       * If receptionType is DELIVERY_FAILURE | CANCELED_IP | REJET_CLIENT
       * productItemsToReceived[] are required
       */
      if (
        reception.type === ReceptionType.DELIVERY_CANCELLATION ||
        reception.type === ReceptionType.INTERNAL_PROBLEM ||
        reception.type === ReceptionType.REJET_LIVRAISON ||
        reception.type === ReceptionType.CUSTOMER_RETURN ||
        reception.type === ReceptionType.INVENTORY ||
        reception.type === ReceptionType.CANCEL_TRANSFERT
      ) {
        /**
         * productItemsToReceived validation
         */
        if (
          !input.productItemsToReceived ||
          input.productItemsToReceived.length === 0
        ) {
          throw new BadRequestException(
            `Cannot validate ${ReceptionType.DELIVERY_CANCELLATION}, ${ReceptionType.INTERNAL_PROBLEM} or ${ReceptionType.REJET_LIVRAISON} reception with empty lines`,
          );
        }

        await Promise.all(
          input.productItemsToReceived.map(async (itemsToReceivedLine) => {
            const { variantId, receivedItemBarcodes } = itemsToReceivedLine;

            const variant = await this._productVariantRepository.findOne(
              variantId,
            );
            if (!variant) {
              throw new NotFoundException(
                `The variant with id ${variantId} is not found`,
              );
            }

            /**
             * Get received items
             */
            const receivedItems: ProductItem[] = [];
            await Promise.all(
              receivedItemBarcodes.map(async (barcode) => {
                const receivedItem = await this._productItemRepository.findOne(
                  { barcode },
                  {
                    relations: ['productVariant', 'stockMovements', 'location'],
                  },
                );
                if (!receivedItem) {
                  throw new NotFoundException(
                    `Product with barcode ${barcode} is not found`,
                  );
                }

                receivedItems.push(receivedItem);
              }),
            );

            /**
             * Are each received item belong to variant ?
             */
            if (
              receivedItems.some(
                (receivedItem) => receivedItem.productVariantId !== variant.id,
              )
            ) {
              throw new BadRequestException(
                `Some product items provided are not ${getLangOrFirstAvailableValue(
                  variant.title,
                  lang,
                )} items`,
              );
            }

            /**
             * Build validatedItemsToReceived and
             * reportedItemsToReceived
             */
            const reportedItems: ProductItem[] = [];
            reception.productItems.forEach((item) => {
              if (
                !receivedItems.find(
                  (receivedItem) => receivedItem.id === item.id,
                )
              ) {
                reportedItems.push(item);
              }
            });

            if (reportedItems.length > 0) {
              const reportedItemsModel: ProductItemsToReceivedModel = {
                variant,
                receivedItems: receivedItems,
              };
              reportedItemsToReceived.push(reportedItemsModel);
            }

            const validatedItemsModel: ProductItemsToReceivedModel = {
              variant,
              receivedItems,
            };
            validatedItemsToReceived.push(validatedItemsModel);
          }),
        );
      }

      const totalVariantItems = validatedVariantsToReceived.reduce(
        (total, line) => total + line.newQuantity,
        0,
      );

      if (
        totalVariantItems > RECEPTION_MAXIMUM_QUANTITY ||
        validatedItemsToReceived.length > RECEPTION_MAXIMUM_QUANTITY
      ) {
        throw new BadRequestException(
          `It's not recommended to launch a validation of more than ${RECEPTION_MAXIMUM_QUANTITY} items. It would be better to proceed with partial validations.`,
        );
      }

      return {
        reception,
        defaultReceptionLocation,
        defaultPreparationLocation,
        completedMobileUnitsToReceived,
        reportedMobileUnitsToReceived,
        validatedVariantsToReceived,
        reportedVariantsToReceived,
        validatedItemsToReceived,
        reportedItemsToReceived,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateReceptionService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
