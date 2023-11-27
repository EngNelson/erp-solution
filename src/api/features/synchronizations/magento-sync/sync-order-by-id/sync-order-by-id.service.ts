import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SyncOrderByIdInput } from './dto';
import { ISOLang, UserCon, isNullOrWhiteSpace } from '@glosuite/shared';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { InjectRepository } from '@nestjs/typeorm';
import { ArticleOrdered, Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import {
  DOUALA_CITY,
  GET_ORDERS,
  MAGENTO_BASE_API_URL,
  MAGENTO_USER_TOKEN,
  UPDATE_MAGENTO_ORDER_STATUS,
  YAOUNDE_CITY,
} from 'src/domain/constants';
import { SharedService } from 'src/services/utilities';
import { HttpService } from '@nestjs/axios';
import {
  MagentoOrderModel,
  MagentoOrderStatusHistory,
} from 'src/domain/interfaces/magento/orders';
import { ProductVariant } from 'src/domain/entities/items';
import { ProductVariantRepository } from 'src/repositories/items';
import {
  CrawlArticlesService,
  OrderService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { AllowAction, MagentoOrderStatus } from 'src/domain/enums/magento';
import { ArticlesOrderedType } from 'src/domain/types/orders';
import { AskVariantToTransfertModel } from 'src/domain/interfaces/flows';
import { ProductVariantToPurchaseModel } from 'src/domain/interfaces/purchases';
import { AvailabilityStatus, OrderStep } from 'src/domain/enums/orders';
import {
  OperationLineState,
  StatusLine,
  StepStatus,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import {
  OrderProcessing,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import {
  OrderProcessingRepository,
  TransfertRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import { TransfertService } from 'src/services/references/flows';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { OrderReferenceService } from 'src/services/references/orders';
import { Address } from 'src/domain/entities/shared';
import { AddressRepository } from 'src/repositories/shared';

@Injectable()
export class SyncOrderByIdService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _crawlArticlesService: CrawlArticlesService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
    private readonly _orderService: OrderService,
    private readonly _transfertReferenceService: TransfertService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async syncOrderById(
    input: SyncOrderByIdInput,
    user: UserCon,
  ): Promise<OrderItemOutput> {
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
    input: SyncOrderByIdInput,
    user: UserCon,
  ): Promise<OrderItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const path = `${MAGENTO_BASE_API_URL}${this._sharedService.buildURL(
        GET_ORDERS,
        null,
        input.magentoOrderId,
        null,
      )}`;

      let magentoOrder: MagentoOrderModel;
      let success = 0;

      do {
        console.log('Import single order articles ordered: ', path);

        await this._httpService
          .axiosRef(path, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            success = 1;
            const item = response.data;

            magentoOrder = {
              entity_id: item.entity_id,
              increment_id: item.increment_id,
              order_currency_code: item.order_currency_code,
              discount_amount: item.discount_amount,
              state: item.state,
              status: item?.status,
              total_qty_ordered: item.total_qty_ordered,
              subtotal: item.subtotal,
              grand_total: item.grand_total,
              created_at: item.created_at,
              updated_at: item.updated_at,
              seller_info: item.extension_attributes.seller_info,
              shipping_description: item.shipping_description,
              billing_address: {
                country_id: item.billing_address.country_id,
                region: item.billing_address.region,
                city: item.billing_address.city,
                fax: item.billing_address.fax,
                email: item.billing_address.email,
                firstname:
                  item.billing_address.firstname !== '-'
                    ? item.billing_address.firstname
                    : undefined,
                lastname: item.billing_address.lastname,
                telephone: item.billing_address.telephone,
                street: item.billing_address.street.filter(
                  (s) => s !== '' && s !== '-',
                )[0],
              },
              shipping_address: {
                country_id:
                  item.extension_attributes.shipping_assignments[0].shipping
                    .address.country_id,
                region:
                  item.extension_attributes.shipping_assignments[0].shipping
                    .address.region,
                city: item.extension_attributes.shipping_assignments[0].shipping
                  .address.city,
                fax: item.extension_attributes.shipping_assignments[0].shipping
                  .address.fax,
                email:
                  item.extension_attributes.shipping_assignments[0].shipping
                    .address.email,
                firstname:
                  item.extension_attributes.shipping_assignments[0].shipping
                    .address.firstname !== '-'
                    ? item.extension_attributes.shipping_assignments[0].shipping
                        .address.firstname
                    : undefined,
                lastname:
                  item.extension_attributes.shipping_assignments[0].shipping
                    .address.lastname,
                telephone:
                  item.extension_attributes.shipping_assignments[0].shipping
                    .address.telephone,
                street:
                  item.extension_attributes.shipping_assignments[0].shipping.address.street.filter(
                    (s) => s !== '' && s !== '-',
                  )[0],
              },
              payment: {
                additional_information: item.payment.additional_information,
                method: item.payment.method,
                shipping_amount: item.payment.shipping_amount,
                payment_additional_info:
                  item.extension_attributes.payment_additional_info,
                last_trans_id: item.payment.last_trans_id,
              },
              status_histories: item.status_histories.filter((e) => {
                const history: MagentoOrderStatusHistory = {
                  status: e?.status,
                  comment: e.comment,
                  created_at: e.created_at,
                };

                if (!isNullOrWhiteSpace(history.comment)) return history;
              }),
              items: this._orderService.buildOrderSyncItems(item.items),
            };
          })
          .catch((error) => {
            success = 0;
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno} : ${error}`,
            );
          });
      } while (success === 0);

      const {
        entity_id,
        increment_id,
        order_currency_code,
        discount_amount,
        state,
        status,
        total_qty_ordered,
        subtotal,
        grand_total,
        created_at,
        updated_at,
        seller_info,
        shipping_description,
        billing_address,
        shipping_address,
        payment,
        status_histories,
        items,
      } = magentoOrder;

      /**
       * Create or update an order
       */
      const order = await this._orderRepository.findOne({
        where: [
          { reference: increment_id as string },
          { magentoID: input.magentoOrderId },
        ],
        relations: ['storagePoint', 'billingAddress', 'deliveryAddress'],
      });

      if (!order) {
        throw new NotFoundException(`This order does not exist`);
      }

      if (order.storagePoint) {
        order.storagePoint.address = await this._addressRepository.findOne({
          where: { id: order.storagePoint.addressId },
        });
      }

      const articlesOrdered: ArticleOrdered[] = [];
      let position = 0;

      /**
       * Get or import articles ordered
       */
      for (const item of items) {
        const {
          product_id,
          sku,
          product_type,
          base_cost,
          price,
          qty_ordered,
          row_total,
          created_at,
          updated_at,
        } = item;

        // if (product_type === 'simple' || product_type === 'configurable') {
        if (product_type === 'simple') {
          let article = await this._productVariantRepository.findOne({
            where: { magentoSKU: sku },
          });

          if (!article) {
            console.log(`"SIMPLE". Import article ${sku} from magento`);

            article = await this._crawlArticlesService.importSingleProduct(
              item.sku,
            );

            if (!article) {
              console.log(
                `An article with SKU '${item.sku}' aws not found in magento`,
              );

              continue;
            }
          }

          const articleOrdered =
            await this._crawlArticlesService.buildArticleOrdered(
              item,
              position,
              order,
              article,
            );
          articlesOrdered.push(articleOrdered);

          position++;
        }
      }

      // await this._articleOrderedRepository.save(articlesOrdered);

      order.articleOrdereds = articlesOrdered;

      await this._orderRepository.save(order);

      /**
       * Try to update magento order status
       */
      if (UPDATE_MAGENTO_ORDER_STATUS === AllowAction.ON) {
        this._updateMagentoDataService.updateOrderStatus(
          order.magentoID,
          MagentoOrderStatus.IMPORTED,
        );
      }

      /**
       * Create related operations
       */
      const articlesOrderedType: ArticlesOrderedType[] = [];

      articlesOrdered.forEach((line) => {
        articlesOrderedType.push({
          articleRef: line.productVariant.reference,
          quantity: line.quantity,
          discount: line.discount,
        });
      });

      const variantsAvailabilities =
        await this._orderService.checkVariantsAvailabilities(
          order.type,
          order.storagePoint,
          articlesOrderedType,
        );

      console.log(
        'Availability Status ====== ',
        variantsAvailabilities?.status,
      );

      /**
       * Get missing variants
       */
      const missingVariants = variantsAvailabilities.availabilities.filter(
        (availability) => availability.missingQty > 0,
      );

      let askVariantsToTransfert: AskVariantToTransfertModel[] = [];
      let variantsToPurchased: ProductVariantToPurchaseModel[] = [];

      // If all variants available in storage point
      if (variantsAvailabilities?.status === AvailabilityStatus.ALL) {
        order.orderStatus = StepStatus.TO_PICK_PACK;
        order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;
      } else if (variantsAvailabilities?.status === AvailabilityStatus.SOME) {
        /**
         * Check if the unvailable variants are available on
         * others storagePoints (i.e localisations.lenght > 0)
         * If yes
         * **** 1. Ask for transfert from thoses storage points
         * **** 2. If missingQty not complete
         * ********** 3. Create purchase order for remaining quantity
         * If not
         * **** 4. Create purchase order for thoses variants
         * If deliveryMode = IN_AGENCY
         * **** 5. Create purchase order for all variants
         */

        const transfertAndPurchaseProcessOutput =
          await this._orderService.transfertAndPurchaseProcess(
            missingVariants,
            order.storagePoint,
            order.deliveryMode,
          );

        askVariantsToTransfert =
          transfertAndPurchaseProcessOutput.askVariantsToTransfert;
        variantsToPurchased =
          transfertAndPurchaseProcessOutput.variantsToPurchased;

        order.orderStatus = StepStatus.TO_TREAT;
        order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;
      } else if (variantsAvailabilities?.status === AvailabilityStatus.NONE) {
        /**
         * Check If missing variants are available in others storage points
         * If yes
         * **** 1. Ask for transfert from thoses storage points
         * **** 2. If missingQty not complte
         * ********** 3. Create purchase order for remaining variants
         * If not
         * **** 4. Create purchase order for thoses variants.
         * If deliveryMode = IN_AGENCY
         * **** 5. Create purchase order for all variants
         */
        const transfertAndPurchaseProcessOutput =
          await this._orderService.transfertAndPurchaseProcess(
            missingVariants,
            order.storagePoint,
            order.deliveryMode,
          );

        askVariantsToTransfert =
          transfertAndPurchaseProcessOutput.askVariantsToTransfert;
        variantsToPurchased =
          transfertAndPurchaseProcessOutput.variantsToPurchased;

        if (askVariantsToTransfert.length === 0) {
          order.orderStatus = StepStatus.TO_BUY;
          order.orderStep = OrderStep.PURCHASE_IN_PROGRESS;
        } else if (variantsToPurchased.length === 0) {
          order.orderStatus = StepStatus.TO_TRANSFER;
          order.orderStep = OrderStep.TRANSFER_IN_PROGRESS;
        } else {
          order.orderStatus = StepStatus.TO_TREAT;
          order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;
        }
      } else {
        console.log('Something wrong appened !. Please try again');
      }

      // console.log('transferts ', askVariantsToTransfert);
      // console.log('purchases ', variantsToPurchased);

      /**
       * If askVariantsToTransfert.lenght > 0
       * ***** Create transferts
       */
      if (askVariantsToTransfert.length > 0) {
        for (const askVariantToTransfert of askVariantsToTransfert) {
          const { sourceStoragePoint, variantsToTransfert } =
            askVariantToTransfert;

          const transfert = new Transfert();

          transfert.reference =
            await this._transfertReferenceService.generateReference();
          transfert.type = TransfertType.ORDER;
          transfert.orderId = order.id;
          transfert.order = order;
          transfert.status = TransfertStatus.PENDING;
          transfert.isRequest = true;
          transfert.source = sourceStoragePoint;
          transfert.sourceId = sourceStoragePoint.id;
          transfert.target = order.storagePoint;
          transfert.targetId = order.storagePointId;

          await this._transfertRepository.save(transfert);

          /**
           * Add variantsToTransfert
           */
          const variantsToTransfertToAdd: VariantTransfert[] = [];
          let transfertPosition = 0;

          if (variantsToTransfert.length > 0) {
            variantsToTransfert.map((variantToTransfert) => {
              const { variant, quantity } = variantToTransfert;

              const variantTransfert = new VariantTransfert();

              variantTransfert.position = transfertPosition;
              variantTransfert.variant = variant;
              variantTransfert.variantId = variant.id;
              variantTransfert.transfert = transfert;
              variantTransfert.transfertId = transfert.id;
              variantTransfert.quantity = quantity;
              variantTransfert.pickedQuantity = 0;
              variantTransfert.status = StatusLine.TO_PICK_PACK;
              variantTransfert.state = OperationLineState.PENDING;

              variantsToTransfertToAdd.push(variantTransfert);
              transfertPosition++;
            });
          }

          await this._variantTransfertRepository.save(variantsToTransfertToAdd);

          if (order.transferts) {
            order.transferts.push(transfert);
          } else {
            order.transferts = [transfert];
          }
        }

        /**
         * If variantsToPurchased.lenght > 0
         * ***** Create purchaseOrder
         */
        if (variantsToPurchased.length > 0) {
          const purchaseOrder = new PurchaseOrder();

          purchaseOrder.reference =
            await this._purchaseOrderReferenceService.generate();
          purchaseOrder.storagePointId = order.storagePointId;
          purchaseOrder.storagePoint = order.storagePoint;
          purchaseOrder.order = order;
          purchaseOrder.orderRef = order.reference;

          await this._purchaseOrderRepository.save(purchaseOrder);

          /**
           * Add variantsToPurchased
           */
          const variantsToPurchasedToAdd: VariantPurchased[] = [];
          let purchasePosition = 0;

          for (const variantToPurchased of variantsToPurchased) {
            const { productVariant, quantity, purchaseCost, supplier } =
              variantToPurchased;

            const variantPurchased = new VariantPurchased();

            variantPurchased.position = purchasePosition;
            variantPurchased.quantity = quantity;
            variantPurchased.state = OperationLineState.PENDING;
            variantPurchased.purchaseCost = purchaseCost;
            variantPurchased.variant = productVariant;
            variantPurchased.variantId = productVariant.id;
            variantPurchased.purchaseOrderId = purchaseOrder.id;
            variantPurchased.purchaseOrder = purchaseOrder;

            if (supplier) {
              variantPurchased.supplier = supplier;
              variantPurchased.supplierId = supplier.id;
            }

            variantsToPurchasedToAdd.push(variantPurchased);
            purchasePosition++;
          }

          await this._variantPurchasedRepository.save(variantsToPurchasedToAdd);

          order.purchaseOrder = purchaseOrder;
        }

        await this._orderRepository.save(order);

        // Create a new order processing
        const orderPrecessing = new OrderProcessing();

        orderPrecessing.reference =
          await this._orderReferenceService.generateOrderProcessingReference(
            order,
          );

        orderPrecessing.state = order.orderStep;
        orderPrecessing.status = order.orderStatus;
        orderPrecessing.startDate = new Date();

        orderPrecessing.orderId = order.id;
        orderPrecessing.order = order;

        await this._orderProcessingRepository.save(orderPrecessing);

        order.articleOrdereds = articlesOrdered;
        order.orderProcessings = [orderPrecessing];
      }

      if (
        this._sharedService.toLowerCaseAndNormalize(
          order.deliveryAddress.city.name,
        ) !== this._sharedService.toLowerCaseAndNormalize(DOUALA_CITY) &&
        this._sharedService.toLowerCaseAndNormalize(
          order.deliveryAddress.city.name,
        ) !== this._sharedService.toLowerCaseAndNormalize(YAOUNDE_CITY)
      ) {
        order.prepaidIsRequired = true;
      }

      await this._orderRepository.save(order);

      const output = await this._orderRepository.findOne({
        where: { id: order.id },
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

      const orderModel = await this._orderService.buildOrderModel(output);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${SyncOrderByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
