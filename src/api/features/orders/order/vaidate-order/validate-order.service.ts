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
  getLangOrFirstAvailableValue,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { OrderItemOutput } from 'src/domain/dto/orders';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { ArticleOrdered, Order } from 'src/domain/entities/orders';
import {
  MovementType,
  StatusLine,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { DeliveryMode, OrderStep } from 'src/domain/enums/orders';
import { VariantProductItemsOutputModel } from 'src/domain/interfaces/items';
import { ArticleOrderedModel } from 'src/domain/interfaces/orders';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  ArticleOrderedRepository,
  OrderRepository,
} from 'src/repositories/orders';
import {
  LocationService,
  OrderService,
  StoragePointService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { ValidateOrderInput } from './dto';
import { OrderProcessing, StockMovement } from 'src/domain/entities/flows';
import {
  OrderProcessingRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import { Location, StoragePoint } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { ItemState } from 'src/domain/enums/items';
import { OrderReferenceService } from 'src/services/references/orders';
import { ArticlesOrderedModel } from 'src/domain/types/orders';
import { CalculateDeliveryFeesService } from 'src/services/delivery-fees';
import {
  AdvanceHistoryStatus,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { SendingSMSService } from 'src/services/sms';
import { MessageType, SendSMSResult } from 'src/domain/enums/sms';

type ValidationResult = {
  order: Order;
  validatedArticlesOrdered: ArticleOrderedModel[];
  inputItems: ProductItem[];
  partialValidation: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ArticleOrdered)
    private readonly _articleOrderedRepository: ArticleOrderedRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _sharedService: SharedService,
    private readonly _orderService: OrderService,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _calculateDeliveryFeesService: CalculateDeliveryFeesService,
    private readonly _locationService: LocationService,
    private readonly _storagePointService: StoragePointService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
    private readonly _sendingSMSService: SendingSMSService,
  ) {}

  async validateOrder(
    input: ValidateOrderInput,
    user: UserCon,
  ): Promise<OrderItemOutput> {
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
  ): Promise<OrderItemOutput> {
    try {
      const {
        order,
        validatedArticlesOrdered,
        inputItems,
        partialValidation,
        lang,
        user,
      } = result;

      /**
       * validatedArticlesOrdered treatment
       * set lines pickedQuantities
       * If all needed articles are available
       * **** set all lines status to PACKED
       * **** Si la livraison a lieu dans le meme entrepot
       * ********* 1. set order orderStatus to READY
       * ********* If FLEET
       * ************** 2. set order orderStep to DELIVERY_TREATMENT
       * ********* If PUS
       * ************** 3. set order orderStep to PENDING_WITHDRAWAL
       * ********* 4. Create stockMovements for each item
       * ********* 5. set each item state to RESERVED and status to PICKED_UP
       * ********* 6. set products and variants available and reserved quantities
       * ********* 7. set locations totalItems
       * ********* 8. link each item to order
       * ********* 9. Update last state and status orderProcessing
       * ********* 10. Create orderProcessing
       * **** Si la livraison a lieu dans un autre entrepot (verifier aussi la ville)
       * ********* 11. set order orderStatus to TO_RECEIVED
       * ********* 12. set order orderStep to IN_TRANSIT
       * ********* 13. repeat actions from 4 to 10 with new data
       * Else
       * **** If partialValidation
       * ******** 14. Set validated lines status to PACKED
       * ******** 15. Create child order (keep orderStatus and orderStep)
       * ********     and validate this order (orderStatus = READY)
       * ********     If FLEET : orderStep = DELIVERY_TREATMENT
       * ********     If PUS: orderStep = PENDING_WITHDRAWAL
       * ******** 16. repeat actions from 4 to 10
       * **** Else
       * ******** 17. save this order (set pickedQuantities, prices and totalPrices)
       */

      const stockMovementsToAdd: StockMovement[] = [];
      const productItemsToEdit: ProductItem[] = [];
      const variantsToEdit: ProductVariant[] = [];
      const actualState = order.orderStep;
      const actualStatus = order.orderStatus;

      const lastOrderProcessing = await this._orderProcessingRepository.findOne(
        {
          where: {
            state: actualState,
            status: actualStatus,
            orderId: order.id,
          },
        },
      );

      // If all needed articles are available
      if (this._isAllItemsAreProvidedInOrder(order, validatedArticlesOrdered)) {
        // set all lines status to PACKED
        const articlesOrderedToEdit: ArticleOrdered[] = [];
        order.articleOrdereds.map((articleOrdered) => {
          articleOrdered.status = StatusLine.PACKED;
          articlesOrderedToEdit.push(articleOrdered);
        });

        await this._articleOrderedRepository.save(articlesOrderedToEdit);

        // Si la livraison a lieu dans le meme entrepot
        const isPreparationInSameWarehouse =
          await this._isPreparationTakePlaceInSameWarehouse(order, inputItems);

        if (isPreparationInSameWarehouse) {
          // Get storage-point default preparation location
          const defaultPreparationLocation =
            await this._storagePointService.getOrCreateStoragePointDefaultPreparationLocation(
              order.storagePoint,
            );

          // 1. set order orderStatus to READY
          order.orderStatus = StepStatus.READY;
          order.readyAt = new Date();
          order.preparedBy = user;

          // If FLEET
          if (order.deliveryMode === DeliveryMode.AT_HOME) {
            // 2. set order orderStep to DELIVERY_TREATMENT
            order.orderStep = OrderStep.DELIVERY_TREATMENT;
          } else {
            // If PUS
            // 3. set order orderStep to PENDING_WITHDRAWAL
            order.orderStep = OrderStep.PENDING_WITHDRAWAL;
          }

          for (const validatedArticleOrdered of validatedArticlesOrdered) {
            const { productItems, ...data } = validatedArticleOrdered;

            for (const productItem of productItems) {
              // 4. Create stockMovements for item
              const stockMovement = new StockMovement();

              stockMovement.movementType = MovementType.INTERNAL;
              stockMovement.triggerType = TriggerType.AUTO;
              stockMovement.triggeredBy = TriggeredBy.PICK_PACK;
              stockMovement.createdBy = user;
              stockMovement.productItemId = productItem.id;
              stockMovement.productItem = productItem;
              stockMovement.sourceType = StockMovementAreaType.LOCATION;
              stockMovement.targetType = StockMovementAreaType.LOCATION;
              stockMovement.sourceLocation = productItem.location;
              stockMovement.targetLocation = !!defaultPreparationLocation
                ? defaultPreparationLocation
                : null;
              stockMovement.orderId = order.id;
              stockMovement.order = order;

              stockMovementsToAdd.push(stockMovement);

              // 6. set products and variants available and reserved quantities
              if (productItem.state === ItemState.AVAILABLE) {
                productItem.productVariant.quantity.available -= 1;
                productItem.productVariant.quantity.reserved += 1;
              }

              const product = await this._productRepository.findOne(
                productItem.productVariant.productId,
              );

              if (productItem.state === ItemState.AVAILABLE) {
                product.quantity.available -= 1;
                product.quantity.reserved += 1;
              }

              await this._productVariantRepository.save(
                productItem.productVariant,
              );

              await this._productRepository.save(product);

              if (
                !variantsToEdit.find(
                  (variant) => variant.id === productItem.productVariantId,
                )
              ) {
                variantsToEdit.push(productItem.productVariant);
              }

              // 7. set locations totalItems
              productItem.location.totalItems -= 1;
              if (defaultPreparationLocation) {
                defaultPreparationLocation.totalItems += 1;

                await this._locationRepository.save(defaultPreparationLocation);
              }

              await this._locationRepository.save(productItem.location);

              // 5. set item state to RESERVED and status to PICKED_UP
              productItem.state = ItemState.RESERVED;
              productItem.status = StepStatus.READY;

              // 8. link each item to order
              productItem.orderId = order.id;
              productItem.order = order;

              productItem.location = defaultPreparationLocation;
              productItem.locationId = defaultPreparationLocation.id;

              if (
                !order.productItems.find((item) => item.id === productItem.id)
              ) {
                order.productItems.push(productItem);
              }

              productItemsToEdit.push(productItem);
            }
          }

          await this._orderRepository.save(order);

          if (lastOrderProcessing) {
            // 9. Update last state and status orderProcessing
            lastOrderProcessing.endDate = new Date();
            await this._orderProcessingRepository.save(lastOrderProcessing);
          }

          // 10. Create orderProcessing
          const orderProcessing = new OrderProcessing();

          orderProcessing.reference =
            await this._orderReferenceService.generateOrderProcessingReference(
              order,
            );
          orderProcessing.state = order.orderStep;
          orderProcessing.status = order.orderStatus;
          orderProcessing.startDate = new Date();
          orderProcessing.orderId = order.id;
          orderProcessing.order = order;

          await this._orderProcessingRepository.save(orderProcessing);
        } else {
          // Si la livraison a lieu dans un autre entrepot
          // 11. set order orderStatus to TO_RECEIVED
          // 12. set order orderStep to IN_TRANSIT
          order.orderStatus = StepStatus.TO_RECEIVED;
          order.orderStep = OrderStep.IN_TRANSIT;

          // 13. repeat actions from 4 to 10 with new data
          for (const validatedArticleOrdered of validatedArticlesOrdered) {
            const { productItems, ...data } = validatedArticleOrdered;

            for (const productItem of productItems) {
              // 4. Create stockMovements for item
              const stockMovement = new StockMovement();

              stockMovement.movementType = MovementType.OUT;
              stockMovement.triggerType = TriggerType.AUTO;
              stockMovement.triggeredBy = TriggeredBy.PICK_PACK;
              stockMovement.createdBy = user;
              stockMovement.productItemId = productItem.id;
              stockMovement.productItem = productItem;
              stockMovement.sourceType = StockMovementAreaType.LOCATION;
              stockMovement.targetType = StockMovementAreaType.IN_TRANSIT;
              stockMovement.sourceLocation = productItem.location;
              stockMovement.orderId = order.id;
              stockMovement.order = order;

              stockMovementsToAdd.push(stockMovement);

              // 6. set products and variants available and inTransit quantities
              if (productItem.state === ItemState.AVAILABLE) {
                productItem.productVariant.quantity.available -= 1;
                productItem.productVariant.quantity.inTransit += 1;
              } else if (productItem.state === ItemState.RESERVED) {
                productItem.productVariant.quantity.reserved -= 1;
                productItem.productVariant.quantity.inTransit += 1;
              }

              const product = await this._productRepository.findOne(
                productItem.productVariant.productId,
              );

              if (productItem.state === ItemState.AVAILABLE) {
                product.quantity.available -= 1;
                product.quantity.inTransit += 1;
              } else if (productItem.state === ItemState.RESERVED) {
                product.quantity.reserved -= 1;
                product.quantity.inTransit += 1;
              }

              await this._productVariantRepository.save(
                productItem.productVariant,
              );

              await this._productRepository.save(product);

              if (
                !variantsToEdit.find(
                  (variant) => variant.id === productItem.productVariantId,
                )
              ) {
                variantsToEdit.push(productItem.productVariant);
              }

              // 7. set locations totalItems
              productItem.location.totalItems -= 1;

              await this._locationRepository.save(productItem.location);

              // 5. set item state to IN_TRANSIT and status to TO_RECEIVED
              productItem.state = ItemState.IN_TRANSIT;
              productItem.status = StepStatus.TO_RECEIVED;

              // 8. link each item to order
              productItem.orderId = order.id;
              productItem.order = order;

              if (
                !order.productItems.find((item) => item.id === productItem.id)
              ) {
                order.productItems.push(productItem);
              }

              productItemsToEdit.push(productItem);
            }
          }

          order.pickedUpAt = new Date();

          await this._orderRepository.save(order);

          if (lastOrderProcessing) {
            // 9. Update last state and status orderProcessing
            lastOrderProcessing.endDate = new Date();
            await this._orderProcessingRepository.save(lastOrderProcessing);
          }

          // 10. Create orderProcessing
          const orderProcessing = new OrderProcessing();

          orderProcessing.reference =
            await this._orderReferenceService.generateOrderProcessingReference(
              order,
            );
          orderProcessing.state = order.orderStep;
          orderProcessing.status = order.orderStatus;
          orderProcessing.startDate = new Date();
          orderProcessing.orderId = order.id;
          orderProcessing.order = order;

          await this._orderProcessingRepository.save(orderProcessing);
        }
      } else {
        // If partialValidation
        if (partialValidation) {
          /**
           * 14. Create child order (keep orderStatus and orderStep)
           * *** and validate this order (orderStatus = READY)
           *
           * Set validated lines status to PACKED
           */
          const reportedOrderedLines: ArticleOrderedModel[] = [];
          const articlesOrderedToEdit: ArticleOrdered[] = [];
          const validatedProductItems: ProductItem[] = [];

          validatedArticlesOrdered.map((validatedArticleOrdered) => {
            const { articleOrdered, quantity, productItems, variant } =
              validatedArticleOrdered;

            const orderLine = order.articleOrdereds.find(
              (line) => line.id === articleOrdered.id,
            );

            if (!orderLine) {
              throw new NotFoundException(`An error occurred.`);
            }

            if (quantity < orderLine.quantity) {
              const reste = orderLine.quantity - quantity;

              const reportedOrderedLine: ArticleOrderedModel = {
                articleOrdered,
                quantity: reste,
                productItems: [],
                variant,
              };
              orderLine.quantity = quantity;

              reportedOrderedLines.push(reportedOrderedLine);
            }

            orderLine.status = StatusLine.PACKED;
            validatedProductItems.push(...productItems);

            articlesOrderedToEdit.push(orderLine);
          });

          await this._articleOrderedRepository.save(articlesOrderedToEdit);

          const childOrder = new Order();

          childOrder.reference = await this._orderReferenceService.generate(
            order.orderSource,
            order,
            true,
          );
          childOrder.barcode = await this._orderService.generateBarCode();
          childOrder.sellerCode = order.sellerCode;
          childOrder.deliveryMode = order.deliveryMode;
          childOrder.preferedDeliveryDate = order.preferedDeliveryDate;
          childOrder.orderSource = order.orderSource;
          childOrder.orderStatus = order.orderStatus;
          childOrder.orderStep = order.orderStep;
          childOrder.subTotal = 0;
          childOrder.total = 0;
          childOrder.billingAddressId = order.billingAddressId;
          childOrder.billingAddress = order.billingAddress;
          childOrder.deliveryAddressId = order.deliveryAddressId;
          childOrder.deliveryAddress = order.deliveryAddress;
          childOrder.voucherId = order.voucherId;
          childOrder.voucher = order.voucher;
          childOrder.storagePointId = order.storagePointId;
          childOrder.storagePoint = order.storagePoint;
          childOrder.parent = order;
          childOrder.createdBy = user;

          await this._orderRepository.save(childOrder);

          // create articlesOrdered ot report
          const childArticlesOrderedToAdd: ArticleOrdered[] = [];
          const childArticlesOrderedModel: ArticlesOrderedModel[] = [];
          const childPrices: number[] = [];
          let childPosition = 0;

          await Promise.all(
            reportedOrderedLines.map(async (reportedLine) => {
              const { articleOrdered, quantity, productItems, variant } =
                reportedLine;

              const productVariant =
                await this._productVariantRepository.findOne({
                  where: { id: variant.id },
                  relations: ['productItems'],
                });

              const reportedOrderedLineToAdd = new ArticleOrdered();

              reportedOrderedLineToAdd.quantity = quantity;
              reportedOrderedLineToAdd.status = StatusLine.TO_PICK_PACK;

              reportedOrderedLineToAdd.price = productVariant.specialPrice
                ? await this._orderService.calculateDiscount(
                    productVariant.specialPrice,
                    productVariant.salePrice,
                  )
                : productVariant.salePrice;

              reportedOrderedLineToAdd.productVariant = productVariant;
              reportedOrderedLineToAdd.productVariantId = productVariant.id;
              reportedOrderedLineToAdd.order = childOrder;
              reportedOrderedLineToAdd.orderId = childOrder.id;
              reportedOrderedLineToAdd.totalPrice =
                quantity * reportedOrderedLineToAdd.price;
              reportedOrderedLineToAdd.position = childPosition;
              reportedOrderedLineToAdd.createdBy = user;

              childArticlesOrderedToAdd.push(reportedOrderedLineToAdd);

              childPosition++;

              const locations =
                await this._sharedService.buildPickPackLocationsOutput(
                  productVariant,
                );

              childArticlesOrderedModel.push({
                articleOrdered: reportedOrderedLineToAdd,
                variantDetails: variant,
                locations,
              });

              childPrices.push(reportedOrderedLineToAdd.totalPrice);
            }),
          );

          await this._articleOrderedRepository.save(childArticlesOrderedToAdd);

          childOrder.articleOrdereds = childArticlesOrderedToAdd;

          /**
           * Calculate order subTotal and total
           * If not global discount
           * ******* subTotal = total = sum of articlesOrdered prices
           * If global discount
           * ******* subTotal = sum of articlesOrdered prices
           * ******* total = discount of subTotal
           */
          console.log('Prices ======================== ', childPrices);

          childOrder.subTotal = childPrices.reduce(
            (sum, current) => sum + current,
            0,
          );
          childOrder.total = childOrder.voucher
            ? await this._orderService.calculateDiscount(
                childOrder.voucher,
                childOrder.subTotal,
              )
            : childOrder.subTotal;
          childOrder.calculatedDeliveryFees =
            await this._calculateDeliveryFeesService.calculateFees(childOrder);
          childOrder.total = childOrder.calculatedDeliveryFees.amount
            ? childOrder.total + childOrder.calculatedDeliveryFees.amount
            : childOrder.total;

          await this._orderRepository.save(childOrder);

          order.subTotal -= childOrder.subTotal;
          order.total -= childOrder.total;
          order.preparedBy = user;
          order.readyAt = new Date();
          order.articleOrdereds = articlesOrderedToEdit;
          order.calculatedDeliveryFees =
            await this._calculateDeliveryFeesService.calculateFees(order);
          order.child = childOrder;

          order.total = order.calculatedDeliveryFees.amount
            ? order.total + order.calculatedDeliveryFees.amount
            : order.total;

          if (
            order.storagePoint?.reference ===
            user.workStation?.warehouse?.reference
          ) {
            // Get storage-point default preparation location
            const defaultPreparationLocation =
              await this._storagePointService.getOrCreateStoragePointDefaultPreparationLocation(
                order.storagePoint,
              );

            order.orderStatus = StepStatus.READY;

            // If FLEET : orderStep = DELIVERY_TREATMENT
            // If PUS: orderStep = PENDING_WITHDRAWAL
            if (order.deliveryMode === DeliveryMode.AT_HOME) {
              order.orderStep = OrderStep.DELIVERY_TREATMENT;
            }

            if (order.deliveryMode === DeliveryMode.IN_AGENCY) {
              order.orderStep = OrderStep.PENDING_WITHDRAWAL;
            }

            await this._orderRepository.save(order);

            // 15. repeat actions from 4 to 10
            for (const validatedArticleOrdered of validatedArticlesOrdered) {
              const { productItems, ...data } = validatedArticleOrdered;

              for (const productItem of productItems) {
                // 4. Create stockMovements for item
                const stockMovement = new StockMovement();

                stockMovement.movementType = MovementType.INTERNAL;
                stockMovement.triggerType = TriggerType.AUTO;
                stockMovement.triggeredBy = TriggeredBy.PICK_PACK;
                stockMovement.createdBy = user;
                stockMovement.productItemId = productItem.id;
                stockMovement.productItem = productItem;
                stockMovement.sourceType = StockMovementAreaType.LOCATION;
                stockMovement.targetType = StockMovementAreaType.LOCATION;
                stockMovement.sourceLocation = productItem.location;
                stockMovement.targetLocation = !!defaultPreparationLocation
                  ? defaultPreparationLocation
                  : null;
                stockMovement.orderId = order.id;
                stockMovement.order = order;

                stockMovementsToAdd.push(stockMovement);

                // 6. set products and variants available and reserved quantities
                if (productItem.state === ItemState.AVAILABLE) {
                  productItem.productVariant.quantity.available -= 1;
                  productItem.productVariant.quantity.reserved += 1;
                }

                const product = await this._productRepository.findOne(
                  productItem.productVariant.productId,
                );

                if (productItem.state === ItemState.AVAILABLE) {
                  product.quantity.available -= 1;
                  product.quantity.reserved += 1;
                }

                await this._productVariantRepository.save(
                  productItem.productVariant,
                );

                await this._productRepository.save(product);

                if (
                  !variantsToEdit.find(
                    (variant) => variant.id === productItem.productVariantId,
                  )
                ) {
                  variantsToEdit.push(productItem.productVariant);
                }

                // 7. set locations totalItems
                productItem.location.totalItems -= 1;
                if (defaultPreparationLocation) {
                  defaultPreparationLocation.totalItems += 1;

                  await this._locationRepository.save(
                    defaultPreparationLocation,
                  );
                }

                await this._locationRepository.save(productItem.location);

                // 5. set item state to RESERVED and status to READY
                productItem.state = ItemState.RESERVED;
                productItem.status = StepStatus.READY;

                // 8. link each item to order
                productItem.orderId = order.id;
                productItem.order = order;

                productItem.location = defaultPreparationLocation;
                productItem.locationId = defaultPreparationLocation.id;

                order.productItems.push(productItem);

                productItemsToEdit.push(productItem);
              }
            }

            order.readyAt = new Date();
            order.pickedUpAt = new Date();
            order.preparedBy = user;

            await this._orderRepository.save(order);

            if (lastOrderProcessing) {
              // 9. Update last state and status orderProcessing
              lastOrderProcessing.endDate = new Date();
              await this._orderProcessingRepository.save(lastOrderProcessing);
            }

            // 10. Create orderProcessing
            const orderProcessing = new OrderProcessing();

            orderProcessing.reference =
              await this._orderReferenceService.generateOrderProcessingReference(
                order,
              );
            orderProcessing.state = order.orderStep;
            orderProcessing.status = order.orderStatus;
            orderProcessing.startDate = new Date();
            orderProcessing.orderId = order.id;
            orderProcessing.order = order;

            await this._orderProcessingRepository.save(orderProcessing);
          } else {
            order.orderStatus = StepStatus.TO_RECEIVED;
            order.orderStep = OrderStep.IN_TRANSIT;

            await this._orderRepository.save(order);

            // 15. repeat actions from 4 to 10
            for (const validatedArticleOrdered of validatedArticlesOrdered) {
              const { productItems, ...data } = validatedArticleOrdered;

              for (const productItem of productItems) {
                // 4. Create stockMovements for item
                const stockMovement = new StockMovement();

                stockMovement.movementType = MovementType.OUT;
                stockMovement.triggerType = TriggerType.AUTO;
                stockMovement.triggeredBy = TriggeredBy.PICK_PACK;
                stockMovement.createdBy = user;
                stockMovement.productItemId = productItem.id;
                stockMovement.productItem = productItem;
                stockMovement.sourceType = StockMovementAreaType.LOCATION;
                stockMovement.targetType = StockMovementAreaType.IN_TRANSIT;
                stockMovement.sourceLocation = productItem.location;
                stockMovement.orderId = order.id;
                stockMovement.order = order;

                stockMovementsToAdd.push(stockMovement);

                // 6. set products and variants available and reserved quantities
                if (productItem.state === ItemState.AVAILABLE) {
                  productItem.productVariant.quantity.available -= 1;
                  productItem.productVariant.quantity.inTransit += 1;
                } else if (productItem.state === ItemState.RESERVED) {
                  productItem.productVariant.quantity.reserved -= 1;
                  productItem.productVariant.quantity.inTransit += 1;
                }

                const product = await this._productRepository.findOne(
                  productItem.productVariant.productId,
                );

                if (productItem.state === ItemState.AVAILABLE) {
                  product.quantity.available -= 1;
                  product.quantity.inTransit += 1;
                } else if (productItem.state === ItemState.RESERVED) {
                  product.quantity.reserved -= 1;
                  product.quantity.inTransit += 1;
                }

                await this._productVariantRepository.save(
                  productItem.productVariant,
                );

                await this._productRepository.save(product);

                if (
                  !variantsToEdit.find(
                    (variant) => variant.id === productItem.productVariantId,
                  )
                ) {
                  variantsToEdit.push(productItem.productVariant);
                }

                // 7. set locations totalItems
                productItem.location.totalItems -= 1;

                await this._locationRepository.save(productItem.location);

                // 5. set item state to RESERVED and status to PICKED_UP
                productItem.state = ItemState.IN_TRANSIT;
                productItem.status = StepStatus.TO_RECEIVED;

                // 8. link each item to order
                productItem.orderId = order.id;
                productItem.order = order;

                order.productItems.push(productItem);

                productItemsToEdit.push(productItem);
              }
            }

            order.pickedUpAt = new Date();

            await this._orderRepository.save(order);

            if (lastOrderProcessing) {
              // 9. Update last state and status orderProcessing
              lastOrderProcessing.endDate = new Date();
              await this._orderProcessingRepository.save(lastOrderProcessing);
            }

            // 10. Create orderProcessing
            const orderProcessing = new OrderProcessing();

            orderProcessing.reference =
              await this._orderReferenceService.generateOrderProcessingReference(
                order,
              );
            orderProcessing.state = order.orderStep;
            orderProcessing.status = order.orderStatus;
            orderProcessing.startDate = new Date();
            orderProcessing.orderId = order.id;
            orderProcessing.order = order;

            await this._orderProcessingRepository.save(orderProcessing);
          }
        } else {
          // 16. save this order (set pickedQuantities, prices and totalPrices)
          order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;
          order.orderStatus = StepStatus.TO_TREAT;
          order.pickedUpAt = new Date();

          await this._orderRepository.save(order);
        }
      }

      // set lines pickedQuantities
      const articlesOrderedToEdit: ArticleOrdered[] = [];

      validatedArticlesOrdered.map((validatedArticleOrdered) => {
        const { articleOrdered, quantity, ...data } = validatedArticleOrdered;

        const articleOrderedToEdit = order.articleOrdereds.find(
          (orderedLine) => orderedLine.id === articleOrdered.id,
        );
        articleOrderedToEdit.pickedQuantity = quantity;

        articlesOrderedToEdit.push(articleOrderedToEdit);
      });

      await this._articleOrderedRepository.save(articlesOrderedToEdit);
      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._productItemRepository.save(productItemsToEdit);

      this._updateMagentoDataService.updateProductsQuantities(variantsToEdit);

      if (
        order.orderStatus === StepStatus.READY &&
        order.deliveryMode === DeliveryMode.IN_AGENCY
      ) {
        let result = SendSMSResult.FAILURE;
        let numberOfTrials = 0;

        do {
          result = await this._sendingSMSService.sendSMS(
            order,
            MessageType.ORDER_READY,
          );
          numberOfTrials++;
        } while (result === SendSMSResult.FAILURE && numberOfTrials <= 2);

        if (result === SendSMSResult.SUCCESS) {
          console.log(`SMS sent to ${order.deliveryAddress.fullName}`);
        } else {
          console.log(
            `The SMS have not been sent to ${order.deliveryAddress.phone} after ${numberOfTrials} tentations.`,
          );
        }
      }

      /**
       * Build output
       */
      const output = await this._orderRepository.findOne(order.id, {
        relations: [
          'billingAddress',
          'deliveryAddress',
          'voucher',
          'storagePoint',
          'child',
          'parent',
          'customerReturns',
          'productItems',
          'transferts',
          'articleOrdereds',
          'orderProcessings',
          'purchaseOrder',
          'stockMovements',
        ],
      });

      const orderModel = await this._orderService.buildOrderModel(output);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateOrderService.name} - ${this._tryExecution.name}: ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ValidateOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get order to validate
       */
      const order = await this._orderRepository.findOne({
        where: { barcode: input.orderBarcode },
        relations: [
          'billingAddress',
          'deliveryAddress',
          'voucher',
          'storagePoint',
          'child',
          'parent',
          'customerReturns',
          'productItems',
          'transferts',
          'articleOrdereds',
          'orderProcessings',
          'purchaseOrder',
        ],
      });

      if (!order) {
        throw new NotFoundException(
          `Order of barcode ${input.orderBarcode} is not found`,
        );
      }

      if (
        order.prepaidIsRequired &&
        order.paymentStatus === PaymentStatus.UNPAID &&
        (order.paymentMode !== PaymentMode.ADVANCE_PAYMENT ||
          !order.advance.history.find(
            (item) => item.status === AdvanceHistoryStatus.PAID,
          ))
      ) {
        throw new BadRequestException(
          `This order required a prepaid. Please add a payment or an advance to the order`,
        );
      }

      if (
        !user.workStation?.warehouse &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN || role === AgentRoles.ADMIN,
        )
      ) {
        throw new UnauthorizedException(
          `You are not authorized to validate an order. Please contact your manager or administrator`,
        );
      }

      /**
       * Restriction temporaire pour WAREHOUSE_MANAGER
       */
      if (
        user.workStation?.warehouse &&
        user.workStation.warehouse.reference !== order.storagePoint.reference &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.WAREHOUSE_MANAGER,
        )
      ) {
        throw new UnauthorizedException(
          `You cannot validate this order since you are not in ${order.storagePoint.name} warehouse.`,
        );
      }

      /**
       * Is order orderStatus = TO_PICK_PACK and orderStep = PREPARATION_IN_PROGRESS
       * or orderStatus = TO_TREAT and orderStep = TREATMENT_IN_PROGRESS (partialValidation)
       */
      if (
        (order.orderStatus !== StepStatus.TO_PICK_PACK ||
          order.orderStep !== OrderStep.PREPARATION_IN_PROGRESS) &&
        (order.orderStatus !== StepStatus.TO_TREAT ||
          order.orderStep !== OrderStep.TREATMENT_IN_PROGRESS) &&
        (order.orderStatus !== StepStatus.TO_BUY ||
          order.orderStep !== OrderStep.PURCHASE_IN_PROGRESS) &&
        order.orderStatus !== StepStatus.TO_TRANSFER
      ) {
        throw new BadRequestException(
          `The order ${order.reference}'status is ${order.orderStatus} and step is ${order.orderStep}. You cannot validate it.`,
        );
      }

      if (
        (order.orderStatus === StepStatus.TO_TREAT ||
          order.orderStep === OrderStep.TREATMENT_IN_PROGRESS) &&
        !input.partialValidation
      ) {
        throw new BadRequestException(
          `If you want to validate an order on ${order.orderStatus} status, please enable partial validation.`,
        );
      }

      if (!input.articleBarcodes || input.articleBarcodes.length === 0) {
        /**
         * articlesOrdered validation
         */
        throw new BadRequestException(`Cannot validate order with no product`);
      }

      /**
       * Get productItems form barcodes and build
       * VariantProductItemsOutputModel[]
       */
      let inputVariants: VariantProductItemsOutputModel[] = [];

      await Promise.all(
        input.articleBarcodes.map(async (barcode) => {
          const productItem = await this._productItemRepository.findOne({
            where: { barcode },
            relations: ['productVariant', 'order', 'location'],
          });

          if (!productItem) {
            throw new BadRequestException(
              `The product with barcode '${barcode}' is not found`,
            );
          }

          if (productItem.order && productItem.orderId !== order.id) {
            throw new BadRequestException(
              `The product with barcode '${barcode}' belongs rather to the order '${productItem.order.reference}'`,
            );
          }

          if (!productItem.order) {
            inputVariants = await this._buildInputVariants(
              productItem,
              inputVariants,
            );
          }
        }),
      );

      /**
       * Complete inputVariants with order.productItems
       */
      await Promise.all(
        order.productItems?.map(async (productItem) => {
          productItem.productVariant =
            await this._productVariantRepository.findOne(
              productItem.productVariantId,
            );

          productItem.location = await this._locationRepository.findOne(
            productItem.locationId,
          );

          inputVariants = await this._buildInputVariants(
            productItem,
            inputVariants,
          );
        }),
      );

      /**
       * Build validatedArticlesOrdered
       */
      const validatedArticlesOrdered: ArticleOrderedModel[] = [];
      const allProductItems: ProductItem[] = [];

      await Promise.all(
        inputVariants.map(async (inputVariant) => {
          const { variant, productItems } = inputVariant;

          const articleOrdered = await this._articleOrderedRepository.findOne({
            where: { orderId: order.id, productVariantId: variant.id },
          });

          if (
            !articleOrdered ||
            !order.articleOrdereds.find(
              (articleOrderedFromOrder) =>
                articleOrderedFromOrder.productVariantId === variant.id,
            )
          ) {
            throw new BadRequestException(
              `Sorry the product '${getLangOrFirstAvailableValue(
                variant.title,
                lang,
              )}' is not in the order ${order.reference}`,
            );
          }

          // Quantities validation
          if (productItems.length > articleOrdered.quantity) {
            throw new BadRequestException(
              `You added the product '${variant.sku}' more than needed`,
            );
          }

          const validatedLine: ArticleOrderedModel = {
            articleOrdered,
            quantity: productItems.length,
            productItems,
            variant,
          };

          validatedArticlesOrdered.push(validatedLine);
          allProductItems.push(...productItems);
        }),
      );

      /**
       * Are all product items in the same warehouse
       */
      const areAllItemsInSameWarehouse =
        await this._areAllItemsInTheSameWarehouse(allProductItems);

      if (!areAllItemsInSameWarehouse) {
        throw new BadRequestException(
          `All product items are not in the same warehouse`,
        );
      }

      return {
        order,
        validatedArticlesOrdered,
        inputItems: allProductItems,
        partialValidation: input.partialValidation,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }

  private async _buildInputVariants(
    productItem: ProductItem,
    inputVariants: VariantProductItemsOutputModel[],
  ): Promise<VariantProductItemsOutputModel[]> {
    try {
      const variantDetails =
        await this._sharedService.buildPartialVariantOutput(
          productItem.productVariant,
        );

      if (
        !inputVariants.some(
          (inputVariant) =>
            inputVariant.variant.id === productItem.productVariantId,
        )
      ) {
        inputVariants.push({
          variant: variantDetails,
          productItems: [productItem],
        });
      } else {
        inputVariants
          .find(
            (inputVariant) =>
              inputVariant.variant.id === productItem.productVariantId,
          )
          .productItems.push(productItem);
      }

      return inputVariants;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateOrderService.name} - ${this._buildInputVariants.name} : ` +
          error.message,
      );
    }
  }

  private _isAllItemsAreProvidedInOrder(
    order: Order,
    validatedArticlesOrdered: ArticleOrderedModel[],
  ): boolean {
    if (
      validatedArticlesOrdered.some(
        (validatedArticleOrdered) =>
          validatedArticleOrdered.quantity <
          order.articleOrdereds.find(
            (articleOrdered) =>
              articleOrdered.productVariantId ===
              validatedArticleOrdered.variant.id,
          ).quantity,
      )
    ) {
      return false;
    }

    return true;
  }

  private async _areAllItemsInTheSameWarehouse(
    productItems: ProductItem[],
  ): Promise<boolean> {
    try {
      const itemsStoragePoints = await this._getItemsWarehouses(productItems);

      return itemsStoragePoints.length === 1;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ValidateOrderService.name} - ${this._areAllItemsInTheSameWarehouse.name} - ` +
          error.message,
      );
    }
  }

  private async _getItemsWarehouses(
    items: ProductItem[],
  ): Promise<StoragePoint[]> {
    try {
      const storagePoints: StoragePoint[] = [];

      for (const item of items) {
        const storagePoint =
          await this._locationService.getLocationStoragePoint(item.location);
        if (
          !storagePoints.find(
            (item) => item.reference === storagePoint.reference,
          )
        ) {
          storagePoints.push(storagePoint);
        }
      }

      return storagePoints;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ValidateOrderService.name} - ${this._getItemsWarehouses.name} - ` +
          error.message,
      );
    }
  }

  private async _isPreparationTakePlaceInSameWarehouse(
    order: Order,
    orderItems: ProductItem[],
  ): Promise<boolean> {
    try {
      const itemsStoragePoints = await this._getItemsWarehouses(orderItems);

      return itemsStoragePoints[0].reference === order.storagePoint.reference;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ValidateOrderService.name} - ${this._isPreparationTakePlaceInSameWarehouse.name} - ` +
          error.message,
      );
    }
  }
}
