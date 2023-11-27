import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  Department,
  DiscountType,
  MiniUserCon,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import {
  OrderProcessing,
  Reception,
  Transfert,
} from 'src/domain/entities/flows';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import { PurchaseOrder, Supplier } from 'src/domain/entities/purchases';
import { Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  ReceptionType,
  StatusLine,
  StepStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  AvailabilityStatus,
  DeliveryMode,
  OrderType,
  OrderSource,
  OrderVersion,
  OrderStep,
  ToBeCashed,
  OrderProcessingAction,
} from 'src/domain/enums/orders';
import {
  AvailabilityResultModel,
  CancelReasonItem,
  CancelReasonModel,
  ChangesToApplyOutputModel,
  MiniChangesToApplyOutputModel,
  TransfertAndPurchaseProcessOutput,
  UserConFilter,
  VariantAvailability,
  VariantsAvailabilities,
} from 'src/domain/interfaces/orders';
import {
  ArticlesOrderedModel,
  ArticlesOrderedToEditType,
  ArticlesOrderedType,
  OrderModel,
} from 'src/domain/types/orders';
import { OrderProcessingRepository } from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  ArticleOrderedRepository,
  OrderRepository,
} from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  SupplierRepository,
} from 'src/repositories/purchases';
import {
  LocationRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { SharedService } from '../utilities';
import { ProductsService } from './products.service';
import { StoragePointService } from './storage-point.service';
import { CommentModel } from 'src/domain/interfaces';
import {
  AdvanceModel,
  AdvancePaymentHistoryModel,
  Instalment,
  InstalmentModel,
} from 'src/domain/interfaces/finance';
import {
  AdvanceHistoryStatus,
  InstalmentStatus,
  PaymentMethod,
} from 'src/domain/enums/finance';
import {
  CALAFATAS_WAREHOUSE_REFERENCE,
  CANCEL_REASON_DATA,
  DRUOUT_WAREHOUSE_REFERENCE,
  KATIOS_WAREHOUSE_REFERENCE,
  SOUDANAISE_WAREHOUSE_REFERENCE,
  THIRTY_DAYS,
} from 'src/domain/constants/public.constants';
import { MiniOrderOutput } from 'src/domain/dto/orders';
import {
  FLEET_SYNC_MAPPING,
  ORDER_STATUS_MAPPING,
  PUS_DRUOUT_DOUALA,
  PUS_SOUDANAISE_DOUALA,
  PUS_CALAFATAS_YAOUNDE,
  SHIPPING_DESCRIPTION_MAPPING,
  SHIPPING_MAPPING,
  WAREHOUSE_PRIMARY_CITY,
  PUS_KATIOS_YAOUNDE,
  REQUEST_TRANSFER_FOR_ORDERS,
  DOUALA_CITY,
  YAOUNDE_CITY,
} from 'src/domain/constants';
import {
  AllowAction,
  MagentoOrderState,
  MagentoPaymentMethod,
} from 'src/domain/enums/magento';
import {
  MagentoAddressModel,
  MagentoArticleOrdered,
  MagentoOrderStatusHistory,
} from 'src/domain/interfaces/magento/orders';
import { Like } from 'typeorm';
import { AskVariantToTransfertModel } from 'src/domain/interfaces/flows';
import { ProductVariantToPurchaseModel } from 'src/domain/interfaces/purchases';
import { OrderReferenceService } from '../references/orders';
import { Address } from 'src/domain/entities/shared';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(ArticleOrdered)
    private readonly _articleOrderedRepository: ArticleOrderedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    private readonly _storagePointService: StoragePointService,
    private readonly _productsService: ProductsService,
    private readonly _sharedService: SharedService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async checkVariantsAvailabilities(
    outputType: OrderType,
    storagePoint: StoragePoint,
    articlesOrdered: ArticlesOrderedType[],
    deeperCheck?: boolean,
  ): Promise<VariantsAvailabilities> {
    if (deeperCheck) console.log('Deeper check .....');

    try {
      const variantsAvailabilities: VariantsAvailabilities = {
        status: null,
        availabilities: [],
      };

      for (const articleOrdered of articlesOrdered) {
        const { quantity, articleRef, ...datas } = articleOrdered;

        const variant = await this._productVariantRepository.findOneOrFail({
          where: { reference: articleRef },
          relations: ['productItems'],
        });

        const variantAvailability = await this._checkAvailability(
          outputType,
          storagePoint,
          variant,
          quantity,
          deeperCheck,
        );

        variantsAvailabilities.availabilities.push(variantAvailability);
      }

      if (
        !variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty !== 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.ALL;
      }

      if (
        variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty === 0,
        ) &&
        variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty > 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.SOME;
      }

      if (
        !variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty === 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.NONE;
      }

      return variantsAvailabilities;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async checkVariantsAvailabilitiesForOrderEdit(
    outputType: OrderType,
    storagePoint: StoragePoint,
    articlesOrdered: ArticlesOrderedToEditType[],
  ): Promise<VariantsAvailabilities> {
    try {
      const variantsAvailabilities: VariantsAvailabilities = {
        status: null,
        availabilities: [],
      };

      for (const articleOrdered of articlesOrdered) {
        const { quantity, articleId, ...datas } = articleOrdered;

        const variant = await this._productVariantRepository.findOneOrFail({
          where: { id: articleId },
          relations: ['productItems'],
        });

        const variantAvailability = await this._checkAvailability(
          outputType,
          storagePoint,
          variant,
          quantity,
        );

        variantsAvailabilities.availabilities.push(variantAvailability);
      }

      if (
        !variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty !== 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.ALL;
      }

      if (
        variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty === 0,
        ) &&
        variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty > 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.SOME;
      }

      if (
        !variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty === 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.NONE;
      }

      return variantsAvailabilities;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async generateBarCode(): Promise<string> {
    try {
      const orders = await this._orderRepository.find();
      let barcode: string;
      let isBarcodeExist = true;

      do {
        barcode = (await this._sharedService.randomNumber(13)).toString();
        isBarcodeExist = orders.some((order) => order.barcode === barcode);
      } while (isBarcodeExist);

      return barcode;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async setOrdersStatusAfterReceptionV2(
    items: ProductItem[],
    reception: Reception,
  ): Promise<Order[]> {
    try {
      console.log('AVAILABILITY CHECKING');

      const ordersToEdit: Order[] = [];
      const articleOrderedsToEdit: ArticleOrdered[] = [];

      /**
       * Get all order on this storagePoint
       * with orderStatus = TO_TREAT or TO_BUY or TO_RECEIVED
       * If all items status needed on order = AVAILABLE or RESERVED
       */
      const orders = await this._orderRepository.find({
        where: [
          {
            storagePointId: reception.storagePointId,
            orderStatus: StepStatus.TO_BUY,
            version: OrderVersion.CURRENT,
          },
          {
            storagePointId: reception.storagePointId,
            orderStatus: StepStatus.TO_TREAT,
            version: OrderVersion.CURRENT,
          },
          {
            storagePointId: reception.storagePointId,
            orderStatus: StepStatus.TO_RECEIVED,
            version: OrderVersion.CURRENT,
          },
        ],
        relations: ['articleOrdereds'],
        order: { createdAt: 'ASC' },
      });

      console.log('ORDERS TO TREAT ===== ', orders.length);

      if (orders && orders.length > 0) {
        const ordersToTreat = orders.filter(
          (order) => order.orderStatus === StepStatus.TO_TREAT,
        );
        const ordersToBuy = orders.filter(
          (order) => order.orderStatus === StepStatus.TO_BUY,
        );
        const ordersToReceived = orders.filter(
          (order) => order.orderStatus === StepStatus.TO_RECEIVED,
        );

        console.log('Awaiting orders to buy', ordersToBuy.length);
        console.log('Awaiting orders to treat', ordersToTreat.length);
        console.log('Awaiting orders to received', ordersToReceived.length);

        switch (reception.type) {
          case ReceptionType.TRANSFERT:
            break;

          case ReceptionType.PURCHASE_ORDER:
            break;

          case ReceptionType.AUTRE_ENTREE ||
            ReceptionType.INTERNAL_PROBLEM ||
            ReceptionType.REJET_LIVRAISON ||
            ReceptionType.AUTRE_ENTREE ||
            ReceptionType.INVENTORY ||
            ReceptionType.UPDATED_ORDER ||
            ReceptionType.CUSTOMER_RETURN:
            break;
        }

        await this._articleOrderedRepository.save(articleOrderedsToEdit);
      }

      return orders;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async setOrdersStatusAfterReception(
    items: ProductItem[],
    reception: Reception,
  ): Promise<Order[]> {
    try {
      const ordersEdited: Order[] = [];
      const articleOrderedsToEdit: ArticleOrdered[] = [];

      if (reception.order) {
        const order = await this._orderRepository.findOne({
          where: { id: reception.orderId },
          relations: ['articleOrdereds'],
        });

        if (order) {
          if (order.articleOrdereds.length > 0) {
            const { orderEdited, articlesOrdereds, remainingItems } =
              await this._calculateOrderStatus(order, items, reception);

            ordersEdited.push(orderEdited);
            articleOrderedsToEdit.push(...articlesOrdereds);
          }
        }
      } else {
        console.log('AVAILABILITY CHECKING');
        let itemsToUse = items.length;
        /**
         * Get all order on this storagePoint
         * with orderStatus = TO_TREAT or TO_BUY or TO_RECEIVED
         * If all items status needed on order = AVAILABLE or RESERVED
         */
        const orders = await this._orderRepository.find({
          where: [
            {
              storagePointId: reception.storagePointId,
              orderStatus: StepStatus.TO_BUY,
              version: OrderVersion.CURRENT,
            },
            {
              storagePointId: reception.storagePointId,
              orderStatus: StepStatus.TO_TREAT,
              version: OrderVersion.CURRENT,
            },
            {
              storagePointId: reception.storagePointId,
              orderStatus: StepStatus.TO_RECEIVED,
              version: OrderVersion.CURRENT,
            },
            {
              storagePointId: reception.storagePointId,
              orderStatus: StepStatus.TO_TRANSFER,
              version: OrderVersion.CURRENT,
            },
          ],
          relations: ['articleOrdereds'],
          order: { createdAt: 'ASC' },
        });

        console.log('ORDERS TO TREAT ===== ', orders.length);

        if (orders && orders.length > 0) {
          let ordersToTreat = orders.filter(
            (order) => order.orderStatus === StepStatus.TO_TREAT,
          );
          let ordersToBuy = orders.filter(
            (order) => order.orderStatus === StepStatus.TO_BUY,
          );
          let ordersToReceived = orders.filter(
            (order) => order.orderStatus === StepStatus.TO_RECEIVED,
          );
          const ordersToTransfer = orders.filter(
            (order) => order.orderStatus === StepStatus.TO_TRANSFER,
          );

          console.log('Awaiting orders to buy', ordersToBuy.length);
          console.log('Awaiting orders to treat', ordersToTreat.length);
          console.log('Awaiting orders to received', ordersToReceived.length);
          console.log('Awaiting orders to transfer', ordersToTransfer.length);

          switch (reception.type) {
            case ReceptionType.TRANSFERT:
              if (
                reception.mobileUnits[0].transfert.type === TransfertType.ORDER
              ) {
                // Get the order
                // const order = await this._orderRepository.findOne({
                //   where: { id: reception.mobileUnits[0].transfert.orderId },
                //   relations: ['articleOrdereds'],
                // });
                const order = orders.find(
                  (order) =>
                    order.id === reception.mobileUnits[0].transfert.orderId,
                );

                if (order) {
                  if (order.articleOrdereds.length > 0) {
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(order, items, reception);

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }

                  ordersToReceived = ordersToReceived.filter(
                    (orderToReceived) => orderToReceived.id !== order.id,
                  );
                }

                if (ordersToReceived.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToReceived) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });

                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }

                if (ordersToTreat.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToTreat) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }

                if (ordersToBuy.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToBuy) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }

                if (ordersToTransfer.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToTransfer) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }
              }

              if (
                reception.mobileUnits[0].transfert.type === TransfertType.MANUAL
              ) {
                if (ordersToTreat.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToTreat) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }

                if (ordersToBuy.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToBuy) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }

                if (ordersToReceived.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToReceived) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }

                if (ordersToTransfer.length > 0 && itemsToUse > 0) {
                  for (const order of ordersToTransfer) {
                    if (itemsToUse > 0) {
                      const newItems: ProductItem[] = [];
                      let count = 0;
                      items.forEach((item) => {
                        count++;
                        if (count <= itemsToUse) {
                          newItems.push(item);
                        }
                      });
                      const { orderEdited, articlesOrdereds, remainingItems } =
                        await this._calculateOrderStatus(
                          order,
                          newItems,
                          reception,
                        );

                      ordersEdited.push(orderEdited);
                      articleOrderedsToEdit.push(...articlesOrdereds);

                      itemsToUse = remainingItems;
                    }
                  }
                }
              }
              break;

            case ReceptionType.PURCHASE_ORDER:
              if (reception.purchaseOrder.order) {
                // const order = await this._orderRepository.findOne({
                //   where: { reference: reception.purchaseOrder.orderRef },
                //   relations: ['articleOrdereds'],
                // });
                const order = orders.find(
                  (order) =>
                    order.reference === reception.purchaseOrder.orderRef,
                );

                if (order) {
                  const { orderEdited, articlesOrdereds, remainingItems } =
                    await this._calculateOrderStatus(order, items, reception);

                  ordersEdited.push(orderEdited);
                  articleOrderedsToEdit.push(...articlesOrdereds);

                  itemsToUse = remainingItems;
                  ordersToTreat = ordersToTreat.filter(
                    (orderToTreat) => orderToTreat.id !== order.id,
                  );
                  ordersToBuy = ordersToBuy.filter(
                    (orderToBuy) => orderToBuy.id !== order.id,
                  );
                }
              }

              if (ordersToTreat.length > 0 && itemsToUse > 0) {
                for (const order of ordersToTreat) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToBuy.length > 0 && itemsToUse > 0) {
                for (const order of ordersToBuy) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToReceived.length > 0 && itemsToUse > 0) {
                for (const order of ordersToReceived) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToTransfer.length > 0 && itemsToUse > 0) {
                for (const order of ordersToTransfer) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              break;

            case ReceptionType.ORDER:
              if (reception.order) {
                // const order = await this._orderRepository.findOne({
                //   where: { reference: reception.purchaseOrder.orderRef },
                //   relations: ['articleOrdereds'],
                // });
                const order = await this._orderRepository.findOne({
                  where: { id: reception.orderId },
                  relations: ['articleOrdereds'],
                });

                if (order) {
                  const { orderEdited, articlesOrdereds, remainingItems } =
                    await this._calculateOrderStatus(order, items, reception);

                  ordersEdited.push(orderEdited);
                  articleOrderedsToEdit.push(...articlesOrdereds);

                  itemsToUse = remainingItems;

                  ordersToTreat = ordersToTreat.filter(
                    (orderToTreat) => orderToTreat.id !== order.id,
                  );
                  ordersToBuy = ordersToBuy.filter(
                    (orderToBuy) => orderToBuy.id !== order.id,
                  );
                  ordersToReceived = ordersToReceived.filter(
                    (orderToReceived) => orderToReceived.id !== order.id,
                  );
                }
              }

              if (ordersToTreat.length > 0 && itemsToUse > 0) {
                for (const order of ordersToTreat) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });

                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToBuy.length > 0 && itemsToUse > 0) {
                for (const order of ordersToBuy) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToReceived.length > 0 && itemsToUse > 0) {
                for (const order of ordersToReceived) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToTransfer.length > 0 && itemsToUse > 0) {
                for (const order of ordersToTransfer) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              break;

            case ReceptionType.AUTRE_ENTREE ||
              ReceptionType.INTERNAL_PROBLEM ||
              ReceptionType.REJET_LIVRAISON ||
              ReceptionType.INVENTORY ||
              ReceptionType.UPDATED_ORDER ||
              ReceptionType.CUSTOMER_RETURN:
              if (ordersToTreat.length > 0 && itemsToUse > 0) {
                for (const order of ordersToTreat) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToBuy.length > 0 && itemsToUse > 0) {
                for (const order of ordersToBuy) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToReceived.length > 0 && itemsToUse > 0) {
                for (const order of ordersToReceived) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              if (ordersToTransfer.length > 0 && itemsToUse > 0) {
                for (const order of ordersToTransfer) {
                  if (itemsToUse > 0) {
                    const newItems: ProductItem[] = [];
                    let count = 0;
                    items.forEach((item) => {
                      count++;
                      if (count <= itemsToUse) {
                        newItems.push(item);
                      }
                    });
                    const { orderEdited, articlesOrdereds, remainingItems } =
                      await this._calculateOrderStatus(
                        order,
                        newItems,
                        reception,
                      );

                    ordersEdited.push(orderEdited);
                    articleOrderedsToEdit.push(...articlesOrdereds);

                    itemsToUse = remainingItems;
                  }
                }
              }

              break;
          }
        }
      }

      await this._articleOrderedRepository.save(articleOrderedsToEdit);

      console.log(`Total orders updated: ${ordersEdited.length}`);
      if (ordersEdited.length > 0) {
        ordersEdited.forEach((order) =>
          console.log(`------> ${order.reference}`),
        );
      }

      return ordersEdited;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async addOrderProcessing(order: Order) {
    const orderProcessing = new OrderProcessing();

    orderProcessing.reference =
      await this._orderReferenceService.generateOrderProcessingReference(order);
    orderProcessing.state = order.orderStep;
    orderProcessing.status = order.orderStatus;
    orderProcessing.startDate = new Date();
    orderProcessing.orderId = order.id;
    orderProcessing.order = order;

    await this._orderProcessingRepository.save(orderProcessing);
  }

  private async _calculateOrderStatus(
    order: Order,
    items: ProductItem[],
    reception: Reception,
  ): Promise<{
    orderEdited: Order;
    articlesOrdereds: ArticleOrdered[];
    remainingItems?: number;
  }> {
    const articleOrderedsToEdit: ArticleOrdered[] = [];

    const { status, remainingItems } =
      await this._checkAvailabilityOnSpecificItems(
        items,
        order.articleOrdereds,
        reception.storagePoint,
        order.type,
      );

    await this._setOrCreateOrderProcessing(order, OrderProcessingAction.UPDATE);

    if (status === AvailabilityStatus.ALL) {
      await this._updateLastOrderProcessing(order);

      order.orderStatus = StepStatus.TO_PICK_PACK;
      order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;

      for (const articleOrdered of order.articleOrdereds) {
        articleOrdered.status = StatusLine.TO_PICK_PACK;

        articleOrderedsToEdit.push(articleOrdered);
      }

      await this._orderRepository.save(order);
    }

    if (status === AvailabilityStatus.SOME) {
      await this._updateLastOrderProcessing(order);

      order.orderStatus = StepStatus.TO_TREAT;
      order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;

      await this._orderRepository.save(order);
    }

    await this._setOrCreateOrderProcessing(order, OrderProcessingAction.CREATE);

    return {
      orderEdited: order,
      articlesOrdereds: articleOrderedsToEdit,
      remainingItems,
    };
  }

  private async _updateLastOrderProcessing(order: Order) {
    const lastProcessing = await this._orderProcessingRepository.findOne({
      where: {
        state: order.orderStep,
        status: order.orderStatus,
        orderId: order.id,
      },
    });

    if (lastProcessing) {
      lastProcessing.endDate = new Date();
      await this._orderProcessingRepository.save(lastProcessing);
    }
  }

  private async _checkAvailability(
    outputType: OrderType,
    storagePoint: StoragePoint,
    variant: ProductVariant,
    quantity: number,
    deeperCheck?: boolean,
  ): Promise<VariantAvailability> {
    if (deeperCheck) console.log('Deeper check .....');

    let foundQty: number;
    const locations = await this._storagePointService.getStoragePointLocations(
      storagePoint,
    );

    if (outputType === OrderType.DEAD_STOCK_ORDER) {
      foundQty = variant.productItems.filter(
        (productItem) =>
          productItem.state === ItemState.IS_DEAD &&
          locations.some((location) => location.id === productItem.locationId),
      ).length;
    }

    if (outputType === OrderType.DESTOCKAGE_ORDER) {
      foundQty = variant.productItems.filter(
        (productItem) =>
          productItem.state === ItemState.AVAILABLE &&
          locations.some((location) => location.id === productItem.locationId),
      ).length;
    }

    if (
      outputType === OrderType.DEFAULT_ORDER ||
      outputType === OrderType.MAGENTO_ORDER
    ) {
      if (deeperCheck) {
        foundQty = variant.productItems.filter(
          (productItem) =>
            (productItem.state === ItemState.AVAILABLE ||
              productItem.state === ItemState.RESERVED) &&
            locations.some(
              (location) => location.id === productItem.locationId,
            ),
        ).length;
      } else {
        foundQty = variant.productItems.filter(
          (productItem) =>
            productItem.state === ItemState.AVAILABLE &&
            locations.some(
              (location) => location.id === productItem.locationId,
            ),
        ).length;
      }
    }

    const variantLocalisations =
      await this._productsService.getVariantLocalisations(variant);

    const variantAvailability: VariantAvailability = {
      variant,
      missingQty: foundQty > quantity ? 0 : quantity - foundQty,
      localisations: variantLocalisations,
    };

    return variantAvailability;
  }

  private async _setOrCreateOrderProcessing(
    order: Order,
    action: OrderProcessingAction,
  ) {
    switch (action) {
      case OrderProcessingAction.UPDATE:
        const lastOrderProcessing =
          await this._orderProcessingRepository.findOne({
            where: {
              state: order.orderStep,
              status: order.orderStatus,
              orderId: order.id,
            },
          });

        if (lastOrderProcessing) {
          lastOrderProcessing.endDate = new Date();
          await this._orderProcessingRepository.save(lastOrderProcessing);
        }

        break;

      case OrderProcessingAction.CREATE:
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
        break;
    }
  }

  private async _checkAvailabilityOnSpecificItems(
    items: ProductItem[],
    articleOrdereds: ArticleOrdered[],
    storagePoint: StoragePoint,
    orderType: OrderType,
  ): Promise<AvailabilityResultModel> {
    let status: AvailabilityStatus;
    let remainingItems = items.length;

    if (
      !articleOrdereds.some((articleOrdered) =>
        items.find(
          (item) => item.productVariantId === articleOrdered.productVariantId,
        ),
      )
    ) {
      status = AvailabilityStatus.NONE;
      remainingItems = items.length;
    } else if (
      articleOrdereds.filter(
        (articleOrdered) =>
          items.filter(
            (item) => item.productVariantId === articleOrdered.productVariantId,
          ).length >= articleOrdered.quantity,
      ).length === articleOrdereds.length
    ) {
      status = AvailabilityStatus.ALL;
      articleOrdereds.forEach(
        (articleOrdered) => (remainingItems -= articleOrdered.quantity),
      );
    } else {
      /**
       * Deeper checking the availability status
       */
      console.log('DEEPER CHECKING');

      const articlesOrderedToCheck = articleOrdereds.filter(
        (articleOrdered) =>
          !items.find(
            (item) => item.productVariantId === articleOrdered.productVariantId,
          ) ||
          items.filter(
            (item) => item.productVariantId === articleOrdered.productVariantId,
          ).length < articleOrdered.quantity,
      );

      console.log(
        'Articles ordered to check ======== ',
        articlesOrderedToCheck.length,
      );

      if (articlesOrderedToCheck.length > 0) {
        const articlesToCheck: ArticlesOrderedType[] = [];

        for (const articleOrderedToCheck of articlesOrderedToCheck) {
          const article = await this._productVariantRepository.findOne({
            where: { id: articleOrderedToCheck.productVariantId },
          });

          articlesToCheck.push({
            articleRef: article.reference,
            quantity: articleOrderedToCheck.quantity,
          });
        }

        const availabilities = await this.checkVariantsAvailabilities(
          orderType,
          storagePoint,
          articlesToCheck,
          true,
        );

        status =
          availabilities.status !== AvailabilityStatus.NONE
            ? availabilities.status
            : AvailabilityStatus.SOME;
        console.log('Status from deeper checking === ', status);
      } else {
        status = AvailabilityStatus.ALL;
      }

      articleOrdereds.forEach((articleOrdered) => {
        if (
          items.filter(
            (item) => item.productVariantId === articleOrdered.productVariantId,
          ).length >= articleOrdered.quantity
        ) {
          remainingItems -= articleOrdered.quantity;
        } else {
          remainingItems -= items.filter(
            (item) => item.productVariantId === articleOrdered.productVariantId,
          ).length;
        }
      });
    }

    const result: AvailabilityResultModel = {
      status,
      remainingItems,
    };

    console.log('Remaining items ==== ', remainingItems);

    return result;
  }

  getOrderSource(
    outputType: OrderType,
    deliveryAddress: Address,
    deliveryMode?: DeliveryMode,
  ): OrderSource {
    let source: OrderSource;

    if (
      (outputType === OrderType.DEFAULT_ORDER ||
        outputType === OrderType.MAGENTO_ORDER) &&
      deliveryMode === DeliveryMode.AT_HOME
    ) {
      if (
        this._sharedService.toLowerCaseAndNormalize(
          deliveryAddress.city?.name,
        ) === this._sharedService.toLowerCaseAndNormalize(DOUALA_CITY) ||
        this._sharedService.toLowerCaseAndNormalize(
          deliveryAddress.city?.name,
        ) === this._sharedService.toLowerCaseAndNormalize(YAOUNDE_CITY)
      ) {
        source = OrderSource.FLEET;
      } else {
        source = OrderSource.EXPEDITION;
      }
    }

    if (
      (outputType === OrderType.DEFAULT_ORDER ||
        outputType === OrderType.MAGENTO_ORDER) &&
      deliveryMode === DeliveryMode.IN_AGENCY
    ) {
      source = OrderSource.PUS;
    }

    if (outputType === OrderType.DEAD_STOCK_ORDER) {
      source = OrderSource.DEAD_LOCATION;
    }

    if (outputType === OrderType.DESTOCKAGE_ORDER) {
      source = OrderSource.DESTOCKAGE;
    }

    return source;
  }

  async calculateDiscount(
    voucher: Voucher,
    price: number,
    discount?: number,
  ): Promise<number> {
    try {
      let discountPrice: number;
      if (voucher.type === DiscountType.FIXED) {
        discountPrice = voucher.value;
      }

      if (voucher.type === DiscountType.PERCENTAGE) {
        discountPrice = price * (1 - voucher.value / 100);
      }

      if (discount) {
        discountPrice = discountPrice * (1 - discount / 100);
      }

      return discountPrice;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async getUserConFilter(user: UserCon): Promise<UserConFilter> {
    try {
      const userConFilter: UserConFilter = {
        orderStatus: [],
        deliveryMode: undefined,
        storagePoint: undefined,
        toBeCashed: undefined,
      };

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.CATMAN ||
            role === AgentRoles.CUSTOMER_SERVICE ||
            role === AgentRoles.CONTENT ||
            role === AgentRoles.CONTENT_MANAGER,
        )
      ) {
        if (user.roles.some((role) => role === AgentRoles.FLEET_SUPERVISOR)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_TRANSFER,
              StepStatus.TO_PICK_PACK,
              StepStatus.READY,
              StepStatus.TO_DELIVER,
              StepStatus.DELIVERED,
              StepStatus.REPORTED,
              StepStatus.ASSIGNED,
            ],
          );
          userConFilter.deliveryMode = DeliveryMode.AT_HOME;
        }

        if (user.roles.some((role) => role === AgentRoles.PICK_PACK)) {
          userConFilter.orderStatus.push(...[StepStatus.TO_PICK_PACK]);
        }

        if (
          user.roles.some((role) => role === AgentRoles.PROCUREMENT_ASSISTANT)
        ) {
          userConFilter.orderStatus.push(
            ...[StepStatus.TO_BUY, StepStatus.TO_TREAT, StepStatus.TO_TRANSFER],
          );
        }

        if (user.roles.some((role) => role === AgentRoles.RECEIVER)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_TRANSFER,
              StepStatus.TO_RECEIVED,
              StepStatus.TO_STORE,
            ],
          );
        }

        if (user.roles.some((role) => role === AgentRoles.PUS_AGENT)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.READY,
              StepStatus.ASSIGNED,
              StepStatus.PICKED_UP,
              StepStatus.REPORTED,
            ],
          );
          userConFilter.deliveryMode = DeliveryMode.IN_AGENCY;
        }

        if (user.roles.some((role) => role === AgentRoles.PUS_MANAGER)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.READY,
              StepStatus.DELIVERED,
              StepStatus.PICKED_UP,
              StepStatus.REPORTED,
            ],
          );
          userConFilter.deliveryMode = DeliveryMode.IN_AGENCY;
        }

        if (user.roles.some((role) => role === AgentRoles.PUS_CASHIER)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.PICKED_UP,
              StepStatus.DELIVERED,
              StepStatus.REPORTED,
            ],
          );
          userConFilter.deliveryMode = DeliveryMode.IN_AGENCY;
        }

        if (user.roles.some((role) => role === AgentRoles.PUS_COORDINATOR)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.READY,
              StepStatus.ASSIGNED,
              StepStatus.DELIVERED,
              StepStatus.PICKED_UP,
              StepStatus.REPORTED,
            ],
          );
          userConFilter.deliveryMode = DeliveryMode.IN_AGENCY;
        }

        if (user.roles.some((role) => role === AgentRoles.STOCK_AGENT)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.READY,
              StepStatus.TO_PICK_PACK,
              StepStatus.TO_TRANSFER,
              StepStatus.CANCELED,
            ],
          );
        }

        if (user.roles.some((role) => role === AgentRoles.WAREHOUSE_MANAGER)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_TRANSFER,
              StepStatus.TO_STORE,
              StepStatus.TO_PICK_PACK,
              StepStatus.READY,
              StepStatus.TO_DELIVER,
              StepStatus.PICKED_UP,
              StepStatus.TO_RECEIVED,
              StepStatus.INFO_CLIENT,
              StepStatus.REPORTED,
            ],
          );
        }

        if (user.roles.some((role) => role === AgentRoles.LOGISTIC_MANAGER)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_TRANSFER,
              StepStatus.TO_PICK_PACK,
              StepStatus.READY,
              StepStatus.ASSIGNED,
              StepStatus.PICKED_UP,
              StepStatus.TO_DELIVER,
              StepStatus.DELIVERED,
              StepStatus.REFUNDED,
              StepStatus.INFO_CLIENT,
              StepStatus.REPORTED,
            ],
          );
        }

        if (
          user.roles.some(
            (role) =>
              role === AgentRoles.EXPEDITION_SUPERVISOR ||
              role === AgentRoles.EXPEDITION_AGENT,
          )
        ) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_PICK_PACK,
              StepStatus.READY,
              StepStatus.ASSIGNED,
              StepStatus.PICKED_UP,
              StepStatus.TO_DELIVER,
              StepStatus.DELIVERED,
              StepStatus.REFUNDED,
              StepStatus.INFO_CLIENT,
              StepStatus.REPORTED,
            ],
          );
        }

        if (
          user.roles.some(
            (role) =>
              role === AgentRoles.TREASURY || role === AgentRoles.ACCOUNTING,
          )
        ) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_PICK_PACK,
              StepStatus.READY,
              StepStatus.PICKED_UP,
              StepStatus.TO_DELIVER,
              StepStatus.ASSIGNED,
              StepStatus.DELIVERED,
              StepStatus.INFO_CLIENT,
              StepStatus.COMPLETE,
              StepStatus.REFUNDED,
            ],
          );
          if (!user.roles.some((role) => role === AgentRoles.PUS_CASHIER)) {
            userConFilter.toBeCashed = ToBeCashed.YES;
          }
        }

        if (user.roles.some((role) => role === AgentRoles.DELIVER_AGENT)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_DELIVER,
              StepStatus.REPORTED,
              StepStatus.DELIVERED,
              StepStatus.ASSIGNED,
            ],
          );
        }

        if (
          user.roles.some(
            (role) =>
              role === AgentRoles.SAV_AGENT || role === AgentRoles.SAV_MANAGER,
          )
        ) {
          userConFilter.orderStatus.push(StepStatus.AWAITING_SAV);
        }

        if (user.roles.some((role) => role === AgentRoles.DAF)) {
          userConFilter.orderStatus.push(
            ...[
              StepStatus.TO_BUY,
              StepStatus.TO_TREAT,
              StepStatus.TO_TRANSFER,
              StepStatus.TO_PICK_PACK,
              StepStatus.READY,
              StepStatus.ASSIGNED,
              StepStatus.PICKED_UP,
              StepStatus.TO_DELIVER,
              StepStatus.DELIVERED,
              StepStatus.REFUNDED,
              StepStatus.INFO_CLIENT,
              StepStatus.REPORTED,
              StepStatus.COMPLETE,
            ],
          );
        }

        if (
          (user.workStation?.department === Department.WAREHOUSE ||
            user.workStation?.department === Department.LOGISTICS ||
            user.roles.some((role) => role === AgentRoles.TREASURY)) &&
          !user.roles.some(
            (role) =>
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.LOGISTIC_MANAGER ||
              role === AgentRoles.PUS_COORDINATOR ||
              role === AgentRoles.DAF,
          )
        ) {
          userConFilter.storagePoint =
            await this._storagePointRepository.findOneOrFail({
              where: { reference: user.workStation.warehouse?.reference },
            });
        }
      }

      if (userConFilter.orderStatus.length > 0) {
        userConFilter.orderStatus = [...new Set(userConFilter.orderStatus)];
      }

      return userConFilter;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async buildOrderModel(order: Order): Promise<OrderModel> {
    try {
      const articlesOrdered: ArticlesOrderedModel[] = [];

      await Promise.all(
        order.articleOrdereds.map(async (articleOrdered) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: articleOrdered.productVariantId },
            relations: ['productItems'],
          });

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          articlesOrdered.push({
            articleOrdered,
            variantDetails,
            locations,
          });
        }),
      );

      if (order.productItems && order.productItems.length > 0) {
        await Promise.all(
          order.productItems?.map(async (productItem) => {
            productItem.productVariant =
              await this._productVariantRepository.findOne({
                where: { id: productItem.productVariantId },
              });

            productItem.location = await this._locationRepository.findOne({
              where: { id: productItem.locationId },
            });

            productItem.supplier = await this._supplierRepository.findOne({
              where: { id: productItem.supplierId },
            });

            return productItem;
          }),
        );
      }

      if (order.purchaseOrder) {
        order.purchaseOrder = await this._purchaseOrderRepository.findOneOrFail(
          {
            where: { id: order.purchaseOrder.id },
            relations: ['storagePoint'],
          },
        );
      }

      if (order.transferts && order.transferts.length > 0) {
        const orderTransferts: Transfert[] = [];

        for (const transfert of order.transferts) {
          transfert.source = await this._storagePointRepository.findOne({
            where: { id: transfert.sourceId },
          });

          transfert.target = await this._storagePointRepository.findOne({
            where: { id: transfert.targetId },
          });

          orderTransferts.push(transfert);
        }

        order.transferts = orderTransferts;
      }

      await Promise.all(
        order.orderProcessings?.map(async (orderProcessing) => {
          orderProcessing.order = await this._orderRepository.findOne({
            where: { id: orderProcessing.orderId },
          });

          return orderProcessing;
        }),
      );

      if (order.stockMovements && order.stockMovements.length > 0) {
        await Promise.all(
          order.stockMovements?.map(async (movement) => {
            movement.productItem = await this._productItemRepository.findOne({
              where: { id: movement.productItemId },
              relations: ['productVariant', 'location', 'supplier'],
            });

            movement.sourceLocation = await this._locationRepository.findOne({
              where: { id: movement.sourceLocationId },
            });

            movement.targetLocation = await this._locationRepository.findOne({
              where: { id: movement.targetLocationId },
            });

            return movement;
          }),
        );
      }

      let sourceVersion: Order;
      const changesToApply: ChangesToApplyOutputModel[] = [];
      if (
        order.version === OrderVersion.CURRENT &&
        order.changesToApply &&
        order.changesToApply.length > 0
      ) {
        for (const change of order.changesToApply) {
          const { previousVersionId, ...simpleElts } = change;

          const previous = await this._orderRepository.findOneOrFail({
            where: { id: previousVersionId },
          });

          const itemChange: ChangesToApplyOutputModel = {
            ...simpleElts,
            previousVersion: new MiniOrderOutput(previous),
          };

          changesToApply.push(itemChange);
        }
      } else if (order.version === OrderVersion.PREVIOUS) {
        sourceVersion = await this._orderRepository.findOneOrFail({
          where: { id: order.sourceId },
        });
      }

      const orderModel: OrderModel = {
        order,
        articlesOrdered,
        sourceVersion,
        changesToApply,
      };

      return orderModel;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async miniBuildOrderModel(order: Order): Promise<OrderModel> {
    try {
      const articlesOrdered: ArticlesOrderedModel[] = [];

      await Promise.all(
        order.articleOrdereds.map(async (articleOrdered) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: articleOrdered.productVariantId },
            relations: ['productItems'],
          });

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          articlesOrdered.push({
            articleOrdered,
            variantDetails,
            locations,
          });
        }),
      );

      const changesToApply: MiniChangesToApplyOutputModel[] = [];
      if (
        order.version === OrderVersion.CURRENT &&
        order.changesToApply &&
        order.changesToApply.length > 0
      ) {
        for (const change of order.changesToApply) {
          const { previousVersionId, ...simpleElts } = change;

          const itemChange: MiniChangesToApplyOutputModel = {
            ...simpleElts,
          };

          changesToApply.push(itemChange);
        }
      }

      const orderModel: OrderModel = {
        order,
        articlesOrdered,
        changesToApply,
      };

      return orderModel;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  buildOrderComments(
    order: Order,
    comment: string,
    user: UserCon,
  ): CommentModel[] {
    try {
      let comments: CommentModel[] = [];

      const addBy: MiniUserCon = {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        sellerCode: user.sellerCode,
        workStation: user.workStation,
      };

      const commentItem = {
        position: comments.length,
        content: comment,
        addBy,
        createdAt: new Date(),
      };

      if (order.comments && order.comments.length > 0) {
        comments = order.comments;
        comments.push(commentItem);
      } else {
        comments = [commentItem];
      }

      return comments;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  buildOrderInstalments(
    order: Order,
    amount: number,
    user: UserCon,
    paymentMethod?: PaymentMethod,
    paymentRef?: string,
  ): Instalment {
    const instalments = order.instalment;
    const current = instalments.instalments.find(
      (instalment) => instalment.status === InstalmentStatus.UNPAID,
    );
    const cashedBy: MiniUserCon = {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      sellerCode: user.sellerCode,
      workStation: user.workStation,
    };
    const total = instalments.instalments.length;

    if (instalments) {
      instalments.balance -= amount;
      let newInstalment: InstalmentModel;
      let surplus = 0;

      instalments.instalments.map((instalment) => {
        if (instalment.position === current.position) {
          const value = Math.abs(instalment.value - amount);

          if (instalment.value < amount) {
            surplus = value;
          } else if (instalment.value > amount) {
            newInstalment = {
              position: total,
              status: InstalmentStatus.UNPAID,
              value,
              deadline: this._sharedService.addDaysToDate(
                new Date(),
                THIRTY_DAYS,
              ),
            };
          }

          instalment.status = InstalmentStatus.PAID;
          instalment.value = amount;
          instalment.paidAt = new Date();
          instalment.paidBy = cashedBy;
          instalment.paymentMethod = paymentMethod;
          instalment.paymentRef = paymentRef;
        }

        if (surplus) {
          if (instalment.position === total - 1) {
            instalment.value -= surplus;
          }
        }

        return instalment;
      });

      if (newInstalment) {
        instalments.instalments.push(newInstalment);
      }
    }

    return instalments;
  }

  buildOrderAdvances(
    order: Order,
    amount: number,
    user: UserCon,
    paymentMethod?: PaymentMethod,
    paymentRef?: string,
  ): AdvanceModel {
    const advance = order.advance;
    const paidBy: MiniUserCon = {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      sellerCode: user.sellerCode,
      workStation: user.workStation,
    };
    const newPayment: AdvancePaymentHistoryModel = {
      amount,
      status: AdvanceHistoryStatus.PAID,
      paidAt: new Date(),
      paidBy,
      paymentMethod,
      paymentRef,
    };

    advance.firstPayment = amount;
    advance.balance -= amount;
    advance.lastPayment = new Date();
    advance.history.push(newPayment);

    return advance;
  }

  buildOrderCancelReasonItem(code: string): CancelReasonItem {
    const cancelReason = CANCEL_REASON_DATA.find((parent) =>
      parent.children.find((child) => child.code === code),
    );

    const child = cancelReason.children.find((child) => child.code === code);

    const parent: CancelReasonModel = {
      code: cancelReason.code,
      label: cancelReason.label,
    };

    const cancelReasonItem: CancelReasonItem = { ...child, parent };

    return cancelReasonItem;
  }

  calculateTotalInstalments(instalments: InstalmentModel[]): number {
    const values: number[] = [];
    instalments.forEach((instalment) => values.push(instalment.value));
    const totalInstalmentsValue = values.reduce((s, i) => s + i, 0);

    return totalInstalmentsValue;
  }

  calculateOrderTotalWithInstalementRate(
    instalment: Instalment,
    orderTotal: number,
  ): number {
    const { taux, type, balance, instalments } = instalment;

    const totalWithInstalmentRate =
      orderTotal + (orderTotal - instalments[0].value) * (taux / 100);

    return totalWithInstalmentRate;
  }

  extractSellerCodeFromLabel(sellerInfo: string): string {
    let sellerCode: string;

    if (!isNullOrWhiteSpace(sellerInfo)) {
      sellerCode = JSON.parse(sellerInfo).seller_code;
    }

    return sellerCode;
  }

  getDeliveryMode(shipping_description: string): DeliveryMode {
    return SHIPPING_DESCRIPTION_MAPPING.find(
      (item) => item.value == shipping_description,
    )?.mode;
  }

  calculateOrderStatus(_status: string): StepStatus {
    let status: StepStatus;

    const mappings = ORDER_STATUS_MAPPING.filter((item) =>
      item.values.find((v) => v === _status),
    );

    if (mappings.length >= 1) {
      status = mappings[0].status;
    } else {
      status = StepStatus.TO_TREAT;
    }

    return status;
  }

  getOrderSourceFromDeliveryMode(
    deliveryMode: DeliveryMode,
    deliveryAddress: Address,
  ): OrderSource {
    if (deliveryMode === DeliveryMode.AT_HOME) {
      if (
        this._sharedService.toLowerCaseAndNormalize(
          deliveryAddress.city?.name,
        ) === this._sharedService.toLowerCaseAndNormalize(DOUALA_CITY) ||
        this._sharedService.toLowerCaseAndNormalize(
          deliveryAddress.city?.name,
        ) === this._sharedService.toLowerCaseAndNormalize(YAOUNDE_CITY)
      ) {
        return OrderSource.FLEET;
      } else {
        return OrderSource.EXPEDITION;
      }
    } else {
      return OrderSource.PUS;
    }
  }

  calculateOrderState(
    _state: MagentoOrderState,
    status: StepStatus,
  ): OrderStep {
    let state: OrderStep;

    if (_state === MagentoOrderState.CANCELED) {
      state = OrderStep.CANCELED;
    } else if (_state === MagentoOrderState.PROCESSING) {
      switch (status) {
        case StepStatus.TO_TREAT:
          state = OrderStep.TREATMENT_IN_PROGRESS;
          break;

        case StepStatus.TO_BUY:
          state = OrderStep.PURCHASE_IN_PROGRESS;
          break;

        case StepStatus.TO_RECEIVED:
          state = OrderStep.AWAITING_RECEPTION;
          break;

        case StepStatus.TO_PICK_PACK:
          state = OrderStep.PREPARATION_IN_PROGRESS;
          break;

        case StepStatus.READY:
          state = OrderStep.DELIVERY_TREATMENT;
          break;

        case StepStatus.TO_DELIVER:
          state = OrderStep.DELIVERY_IN_PROGRESS;
          break;

        case StepStatus.PICKED_UP:
          state = OrderStep.PENDING_WITHDRAWAL;
          break;

        case StepStatus.COMPLETE:
          state = OrderStep.CASH_IN_HAND;
          break;

        case StepStatus.INFO_CLIENT:
          state = OrderStep.VERIFICATION_IN_PROGRESS;
          break;

        case StepStatus.CANCELED:
          state = OrderStep.CANCELED;
          break;

        case StepStatus.REFUNDED:
          state = OrderStep.REFUNDED;
          break;

        case StepStatus.REPORTED:
          state = OrderStep.DELIVERY_TREATMENT;
          break;

        case StepStatus.ASSIGNED:
          state = OrderStep.DELIVERY_IN_PROGRESS;
          break;

        case StepStatus.DELIVERED:
          state = OrderStep.PAYMENT_IN_PROGRESS;
          break;
      }
    } else if (_state === MagentoOrderState.COMPLETE) {
      state = OrderStep.CASH_IN_HAND;
    }

    return state;
  }

  calculateOrderPaymentMethod(
    method: string,
    additional_information: string[],
  ): PaymentMethod {
    let paymentMethod: PaymentMethod;

    switch (method) {
      case MagentoPaymentMethod.CASH_ON_DELIVERY:
        paymentMethod = PaymentMethod.CASH;
        break;

      case MagentoPaymentMethod.MOBILE_PAYMENT:
        const phone = additional_information[0];
        if (phone.charAt(1) === '7' || phone.charAt(1) === '8') {
          paymentMethod = PaymentMethod.MOBILE_MONEY;
        } else if (
          phone.charAt(1) === '9' ||
          phone.charAt(1) === '5' ||
          phone.charAt(1) === '6'
        ) {
          paymentMethod = PaymentMethod.ORANGE_MONEY;
        }
        break;

      default:
        paymentMethod = PaymentMethod.CASH;
        break;
    }

    return paymentMethod;
  }

  buildOrderCommentsFromMagentoData(
    status_histories: MagentoOrderStatusHistory[],
  ): CommentModel[] {
    const comments: CommentModel[] = [];

    if (status_histories.length > 0) {
      const position = 0;
      status_histories.map((history) => {
        const addBy: MiniUserCon = {
          lastname: 'Magento',
          email: 'magento@glotelho.com',
        };

        const contentSuffix = history.status
          ? `. Magento status: ${history.status}`
          : '';

        const comment: CommentModel = {
          position,
          content: `${history.comment}${contentSuffix}`,
          addBy,
          createdAt: history.created_at,
        };

        comments.push(comment);
      });
    }

    return comments;
  }

  // async getOrderStoragePointV2(
  //   shipping_description: string,
  //   status: string,
  //   shipping_address: MagentoAddressModel,
  // ): Promise<StoragePoint> {
  //   try {
  //     let storagePoint: StoragePoint;

  //     const storagePoints = await this._storagePointRepository.find({
  //       where: { locationKeywords: Like(`%${shipping_description}%`) },
  //     });

  //     if (storagePoints) {
  //       if (storagePoints.length > 1) {
  //         const selections = storagePoints.filter(
  //           (warehouse) =>
  //             warehouse.address.city.name === shipping_address.city,
  //         );
  //       } else if (storagePoints.length === 1) {
  //         storagePoint = storagePoints[0];
  //       } else {
  //         const selections = await this._storagePointRepository.find({
  //           where: { isPrimary: 1 },
  //         });
  //         storagePoint = selections.find(
  //           (warehouse) =>
  //             warehouse.address.city.name === shipping_address.city,
  //         );
  //       }
  //     } else {
  //     }
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       `An error occured : ${error.message}`,
  //     );
  //   }
  // }

  // async getOrderStoragePoint(
  //   shipping_description: string,
  //   status: string,
  //   shipping_address: MagentoAddressModel,
  // ): Promise<StoragePoint> {
  //   console.log('Starting warehouse identification');

  //   try {
  //     let keywords: string[] = [];
  //     let storagePoint: StoragePoint;

  //     const shippingMapping = SHIPPING_DESCRIPTION_MAPPING.find(
  //       (mapping) => mapping.value === shipping_description,
  //     );

  //     if (shippingMapping.keywords.length === 0) {
  //       if (shippingMapping.wh_refs[status]) {
  //         keywords = shippingMapping.wh_refs[status];
  //       } else {
  //         switch (shipping_address.city) {
  //           case DOUALA_CITY:
  //             keywords = shippingMapping.wh_refs['pick_pack_dla'];
  //             break;

  //           case YAOUNDE_CITY:
  //             keywords = shippingMapping.wh_refs['pick_pack_yde'];
  //             break;

  //           default:
  //             keywords = shippingMapping.wh_refs['pick_pack_dla'];
  //             break;
  //         }
  //       }
  //     } else {
  //       keywords = shippingMapping.keywords;
  //     }

  //     let storagePoints: StoragePoint[] = [];
  //     const ids: string[] = [];

  //     await Promise.all(
  //       keywords.map(async (keyword) => {
  //         const warehouses = await this._storagePointRepository.find({
  //           where: { name: Like(`%${keyword}%`) },
  //         });

  //         if (warehouses.length > 0) {
  //           warehouses.forEach((warehouse) => {
  //             ids.push(warehouse.id);
  //             if (
  //               !storagePoints.find(
  //                 (storagePoint) => storagePoint.id === warehouse.id,
  //               )
  //             ) {
  //               storagePoints.push(warehouse);
  //             }
  //           });
  //         }
  //       }),
  //     );

  //     console.log('shipping_description === ', shipping_description);
  //     console.log('status === ', status);
  //     console.log('shipping_address === ', shipping_address);
  //     console.log(`${storagePoints.length} storage point(s) matching`);

  //     if (storagePoints.length === 0) {
  //       storagePoints = await this._storagePointRepository.find();
  //       const selections = storagePoints.filter(
  //         (warehouse) => warehouse.address.city.name === shipping_address.city,
  //       );

  //       storagePoint = selections.find((wh) => wh.isPrimary === 1);
  //     } else {
  //       storagePoint = storagePoints[0];
  //     }

  //     return storagePoint;
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       `An error occured : ${error.message}`,
  //     );
  //   }
  // }

  async getOrderStoragePointV3(
    shipping_description: string,
    shipping_address: MagentoAddressModel,
  ): Promise<StoragePoint> {
    console.log('Starting warehouse identification');

    try {
      let storagePoint: StoragePoint;
      let keywords: string[] = [];
      const primaryWhs = await this._storagePointRepository.find({
        where: { isPrimary: 1 },
        relations: ['address'],
      });
      const allStoragePoints = await this._storagePointRepository.find({
        relations: ['address'],
      });

      if (FLEET_SYNC_MAPPING.includes(shipping_description)) {
        let storagePoints: StoragePoint[] = [];

        if (primaryWhs && primaryWhs.length > 0) {
          storagePoints = primaryWhs;
        } else {
          storagePoints = allStoragePoints;
        }

        storagePoint = storagePoints.find(
          (wh) =>
            this._sharedService.toLowerCaseAndNormalize(
              wh.address.city.name,
            ) ===
            this._sharedService.toLowerCaseAndNormalize(shipping_address.city),
        );

        // If not storage point, find expedition town
      } else if (PUS_DRUOUT_DOUALA.includes(shipping_description)) {
        keywords = SHIPPING_MAPPING.find(
          (mapping) => mapping.value === PUS_DRUOUT_DOUALA,
        ).keywords;
      } else if (PUS_SOUDANAISE_DOUALA.includes(shipping_description)) {
        keywords = SHIPPING_MAPPING.find(
          (mapping) => mapping.value === PUS_SOUDANAISE_DOUALA,
        ).keywords;
      } else if (PUS_CALAFATAS_YAOUNDE.includes(shipping_description)) {
        keywords = SHIPPING_MAPPING.find(
          (mapping) => mapping.value === PUS_CALAFATAS_YAOUNDE,
        ).keywords;
      } else if (PUS_KATIOS_YAOUNDE.includes(shipping_description)) {
        keywords = SHIPPING_MAPPING.find(
          (mapping) => mapping.value === PUS_KATIOS_YAOUNDE,
        ).keywords;
      }

      if (!storagePoint) {
        let storagePoints: StoragePoint[] = [];
        const ids: string[] = [];

        await Promise.all(
          keywords.map(async (keyword) => {
            const warehouses = await this._storagePointRepository.find({
              where: { name: Like(`%${keyword}%`) },
              relations: ['address'],
            });

            if (warehouses.length > 0) {
              warehouses.forEach((warehouse) => {
                ids.push(warehouse.id);
                if (
                  !storagePoints.find(
                    (storagePoint) => storagePoint.id === warehouse.id,
                  )
                ) {
                  storagePoints.push(warehouse);
                }
              });
            }
          }),
        );

        if (storagePoints.length === 0) {
          storagePoints = await this._storagePointRepository.find({
            relations: ['address'],
          });
          const selections = storagePoints.filter(
            (warehouse) =>
              this._sharedService.toLowerCaseAndNormalize(
                warehouse.address.city.name,
              ) ===
              this._sharedService.toLowerCaseAndNormalize(
                shipping_address.city,
              ),
          );

          storagePoint = selections.find((wh) => wh.isPrimary === 1);
        } else {
          storagePoint = storagePoints[0];
        }
      }

      console.log('shipping_description === ', shipping_description);
      console.log('shipping_address === ', shipping_address);
      console.log(`${!!storagePoint ? 1 : 0} storage point matching`);

      if (!storagePoint) {
        console.log('Choose a primary warehouse');
        storagePoint = primaryWhs.find(
          (wh) => wh.address.city.name === WAREHOUSE_PRIMARY_CITY,
        );
      }

      return storagePoint;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async getOrderStoragePointV4(
    shipping_description: string,
    shipping_address: MagentoAddressModel,
  ): Promise<{ storagePoint: StoragePoint; deliveryMode: DeliveryMode }> {
    console.log('Starting warehouse identification');

    try {
      let storagePoint: StoragePoint;
      let deliveryMode: DeliveryMode;

      if (FLEET_SYNC_MAPPING.includes(shipping_description)) {
        const storagePoints = await this._storagePointRepository.find({
          where: [
            { reference: DRUOUT_WAREHOUSE_REFERENCE },
            { reference: CALAFATAS_WAREHOUSE_REFERENCE },
          ],
          relations: ['address'],
        });
        storagePoint = storagePoints.find(
          (wh) =>
            this._sharedService.toLowerCaseAndNormalize(
              wh.address.city.name,
            ) ===
            this._sharedService.toLowerCaseAndNormalize(shipping_address.city),
        );
        deliveryMode = DeliveryMode.AT_HOME;
      } else if (PUS_DRUOUT_DOUALA.includes(shipping_description)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { reference: DRUOUT_WAREHOUSE_REFERENCE },
          relations: ['address'],
        });
        deliveryMode = DeliveryMode.IN_AGENCY;
      } else if (PUS_SOUDANAISE_DOUALA.includes(shipping_description)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { reference: SOUDANAISE_WAREHOUSE_REFERENCE },
          relations: ['address'],
        });
        deliveryMode = DeliveryMode.IN_AGENCY;
      } else if (PUS_CALAFATAS_YAOUNDE.includes(shipping_description)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { reference: CALAFATAS_WAREHOUSE_REFERENCE },
          relations: ['address'],
        });
        deliveryMode = DeliveryMode.IN_AGENCY;
      } else if (PUS_KATIOS_YAOUNDE.includes(shipping_description)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { reference: KATIOS_WAREHOUSE_REFERENCE },
          relations: ['address'],
        });
        deliveryMode = DeliveryMode.IN_AGENCY;
      }

      if (!storagePoint) {
        console.log('Choose a primary warehouse');
        const primaryWhs = await this._storagePointRepository.find({
          where: { isPrimary: 1 },
          relations: ['address'],
        });

        storagePoint = primaryWhs.find(
          (wh) =>
            this._sharedService.toLowerCaseAndNormalize(
              wh.address.city.name,
            ) ===
            this._sharedService.toLowerCaseAndNormalize(WAREHOUSE_PRIMARY_CITY),
        );
      }

      return { storagePoint, deliveryMode };
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  getAddressFullname(lastname: string, firstname: string): string {
    let fullname = lastname;
    if (!isNullOrWhiteSpace(firstname)) {
      fullname += ` ${firstname}`;
    }

    return fullname;
  }

  async transfertAndPurchaseProcess(
    missingVariants: VariantAvailability[],
    targetStoragePoint: StoragePoint,
    deliveryMode: DeliveryMode,
  ): Promise<TransfertAndPurchaseProcessOutput> {
    try {
      // console.log('missing variants ========= ', missingVariants);
      // console.log('target storage point ========= ', targetStoragePoint);
      // console.log('delivery mode ========= ', deliveryMode);

      const askVariantsToTransfert: AskVariantToTransfertModel[] = [];
      const variantsToPurchased: ProductVariantToPurchaseModel[] = [];

      for (const missingVariant of missingVariants) {
        const { variant, missingQty, localisations } = missingVariant;

        const lastSupplier =
          await this._productsService.getLastSupplierAndPurchaseCost(variant);

        const purchaseCost = lastSupplier.supplier
          ? lastSupplier.purchaseCost
          : await this._productsService.getVariantAveragePurchaseCost(variant);

        /**
         * If deliveryMode = IN_AGENCY
         * send all variants to purshase
         */
        if (
          (deliveryMode && deliveryMode === DeliveryMode.IN_AGENCY) ||
          REQUEST_TRANSFER_FOR_ORDERS !== AllowAction.ON
        ) {
          // 5. Create purchase order for all variants if not available in the same town

          variantsToPurchased.push({
            productVariant: variant,
            quantity: missingQty,
            purchaseCost,
            supplier: lastSupplier.supplier,
          });
        } else {
          // is variant available on others storage points ?
          if (
            localisations.some(
              (localisation) =>
                localisation.storagePoint.id !== targetStoragePoint.id,
            )
          ) {
            // 1. Ask for transfert from thoses storage points
            let askQuantity = 0;

            const otherLocalisations = localisations.filter(
              (localisation) =>
                localisation.storagePoint.id !== targetStoragePoint.id,
            );

            if (otherLocalisations.length > 0) {
              const otherLocalisationsOnSameTown = otherLocalisations.filter(
                (localisation) =>
                  localisation.storagePoint.address.city ===
                  targetStoragePoint.address.city,
              );
              const otherLocalisationsOnOtherTown = otherLocalisations.filter(
                (localisation_1) =>
                  !otherLocalisationsOnSameTown.find(
                    (localisation_2) =>
                      localisation_1.storagePoint.id !==
                      localisation_2.storagePoint.id,
                  ),
              );

              for (const otherLocalisation of otherLocalisationsOnSameTown) {
                const { storagePoint, quantity } = otherLocalisation;

                if (askQuantity < missingQty) {
                  const qtyNeeded = missingQty - askQuantity;

                  const newQuantity =
                    quantity <= qtyNeeded ? quantity : qtyNeeded;

                  if (
                    askVariantsToTransfert.find(
                      (askVariantToTransfert) =>
                        askVariantToTransfert.sourceStoragePoint.id ===
                        storagePoint.id,
                    )
                  ) {
                    askVariantsToTransfert
                      .find(
                        (askVariantToTransfert) =>
                          askVariantToTransfert.sourceStoragePoint.id ===
                          storagePoint.id,
                      )
                      .variantsToTransfert.push({
                        variant,
                        quantity: newQuantity,
                      });
                    askQuantity += newQuantity;
                  } else {
                    askVariantsToTransfert.push({
                      sourceStoragePoint: storagePoint,
                      variantsToTransfert: [{ variant, quantity: newQuantity }],
                    });
                    askQuantity += newQuantity;
                  }
                }
              }

              for (const otherLocalisation of otherLocalisationsOnOtherTown) {
                const { storagePoint, quantity } = otherLocalisation;

                if (askQuantity < missingQty) {
                  const qtyNeeded = missingQty - askQuantity;

                  const newQuantity =
                    quantity <= qtyNeeded ? quantity : qtyNeeded;

                  if (
                    askVariantsToTransfert.find(
                      (askVariantToTransfert) =>
                        askVariantToTransfert.sourceStoragePoint.id ===
                        storagePoint.id,
                    )
                  ) {
                    askVariantsToTransfert
                      .find(
                        (askVariantToTransfert) =>
                          askVariantToTransfert.sourceStoragePoint.id ===
                          storagePoint.id,
                      )
                      .variantsToTransfert.push({
                        variant,
                        quantity: newQuantity,
                      });
                    askQuantity += newQuantity;
                  } else {
                    askVariantsToTransfert.push({
                      sourceStoragePoint: storagePoint,
                      variantsToTransfert: [{ variant, quantity: newQuantity }],
                    });
                    askQuantity += newQuantity;
                  }
                }
              }
            }

            // 2. If missingQty not complete
            if (askQuantity < missingQty) {
              // 3. Create purchase order for remaining quantity
              const remainingQty = missingQty - askQuantity;

              variantsToPurchased.push({
                productVariant: variant,
                quantity: remainingQty,
                purchaseCost,
                supplier: lastSupplier.supplier,
              });
            }
          } else {
            // 4. Create purchase order for thoses variants
            variantsToPurchased.push({
              productVariant: variant,
              quantity: missingQty,
              purchaseCost,
              supplier: lastSupplier.supplier,
            });
          }
        }
      }

      const finalVariantsToTransfert = askVariantsToTransfert.filter(
        (askTransfert) =>
          !askTransfert.variantsToTransfert.find(
            (variantToTransfert) => variantToTransfert.quantity === 0,
          ),
      );

      const finalVariantsToPurchased = variantsToPurchased.filter(
        (variantToPurchased) => variantToPurchased.quantity !== 0,
      );

      const transfertAndPurchaseProcessOutput: TransfertAndPurchaseProcessOutput =
        {
          askVariantsToTransfert: finalVariantsToTransfert,
          variantsToPurchased: finalVariantsToPurchased,
        };

      return transfertAndPurchaseProcessOutput;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `An error occured: ${this.transfertAndPurchaseProcess.name} - ${error.message}`,
      );
    }
  }

  getReceptionTypeByOrderCancelReason(
    cancelReason: CancelReasonItem,
  ): ReceptionType {
    switch (cancelReason.parent.code) {
      case ReceptionType.INTERNAL_PROBLEM:
        return ReceptionType.INTERNAL_PROBLEM;

      case ReceptionType.REJET_LIVRAISON:
        return ReceptionType.REJET_LIVRAISON;

      case ReceptionType.DELIVERY_CANCELLATION:
        return ReceptionType.DELIVERY_CANCELLATION;

      case ReceptionType.CUSTOMER_SERVICE:
        return ReceptionType.CUSTOMER_SERVICE;
    }
  }

  buildOrderSyncItems(items: any[]): MagentoArticleOrdered[] {
    const articlesOrdered: MagentoArticleOrdered[] = [];
    items.forEach((line) => {
      // if (line.product_type === 'simple' || line.product_type === 'bundle') {
      if (line.product_type === 'simple') {
        const articleOrdered: MagentoArticleOrdered = {
          product_id: line.product_id,
          sku: line.sku,
          product_type: line.product_type,
          base_cost: line.base_cost,
          price:
            line.parent_item && line.parent_item.product_type === 'configurable'
              ? line.parent_item.price
              : line.price,
          qty_ordered: line.qty_ordered,
          row_total:
            line.parent_item && line.parent_item.product_type === 'configurable'
              ? line.qty_ordered * line.parent_item.price
              : line.row_total,
          created_at: line.created_at,
          updated_at: line.updated_at,
        };

        articlesOrdered.push(articleOrdered);
      }
    });

    return articlesOrdered;
  }

  getStreetByFax(fax: string, city: string, streets: any): string {
    const street = streets[city]?.find((item) => item['quarter_id'] === fax);
    const quarter = street ? street['quarter_name'] : null;
    console.log('Street ==================== ', quarter);

    return quarter;
  }
}
