import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OrderProcessing,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { Address } from 'src/domain/entities/shared';
import {
  OrderProcessingRepository,
  TransfertRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { OrderRepository, VoucherRepository } from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { AddressRepository } from 'src/repositories/shared';
import {
  CrawlArticlesService,
  OrderService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { TransfertService } from 'src/services/references/flows';
import { OrderReferenceService } from 'src/services/references/orders';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SharedService } from 'src/services/utilities';
import { SyncOrderByReferenceInput } from './dto';
import {
  AddressUsage,
  DiscountType,
  ISOLang,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { CrawlPagination, FilterGroups } from 'src/domain/interfaces/magento';
import {
  AllowAction,
  CrawlResult,
  MagentoFilterConditionType,
  MagentoOrderState,
  MagentoOrderStatus,
} from 'src/domain/enums/magento';
import {
  DOUALA_CITY,
  GET_MAGENTO_STREETS_URL,
  GET_ORDERS,
  MAGENTO_BASE_API_URL,
  MAGENTO_USER_TOKEN,
  UPDATE_MAGENTO_ORDER_STATUS,
  YAOUNDE_CITY,
} from 'src/domain/constants';
import {
  MagentoOrderModel,
  MagentoOrderStatusHistory,
} from 'src/domain/interfaces/magento/orders';
import {
  AvailabilityStatus,
  OrderStep,
  OrderType,
  OrderVersion,
} from 'src/domain/enums/orders';
import {
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { ArticlesOrderedType } from 'src/domain/types/orders';
import { AskVariantToTransfertModel } from 'src/domain/interfaces/flows';
import { ProductVariantToPurchaseModel } from 'src/domain/interfaces/purchases';
import {
  OperationLineState,
  StatusLine,
  StepStatus,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';

@Injectable()
export class SyncOrderByReferenceService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    @InjectRepository(Voucher)
    private readonly _voucherRepository: VoucherRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _orderService: OrderService,
    private readonly _crawlArticlesService: CrawlArticlesService,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _transfertReferenceService: TransfertService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async syncOrderByReference(
    input: SyncOrderByReferenceInput,
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
    input: SyncOrderByReferenceInput,
    user: UserCon,
  ): Promise<OrderItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const orderExist = await this._orderRepository.findOne({
        where: { reference: input.orderRef },
      });

      if (orderExist) {
        throw new BadRequestException(
          `The order '${input.orderRef}' already exists in GloSuite`,
        );
      }

      console.log(`Import single order: ${input.orderRef} from magento`);

      const pagination: CrawlPagination = {
        pageSize: 1,
        currentPage: 1,
      };

      const filter: FilterGroups = {
        field: 'increment_id',
        value: input.orderRef,
        conditionType: MagentoFilterConditionType.EQUAL_VALUE,
      };

      const path =
        MAGENTO_BASE_API_URL +
        this._sharedService.buildURL(GET_ORDERS, pagination, null, [filter]);

      console.log(path);

      let magentoOrder: MagentoOrderModel;
      let getStatus = CrawlResult.FAILURE;

      do {
        await this._httpService
          .axiosRef(path, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            getStatus = CrawlResult.SUCCESS;
            const total = response.data.items.length;

            if (total > 0) {
              const item = response.data.items[0];

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
                  city: item.extension_attributes.shipping_assignments[0]
                    .shipping.address.city,
                  fax: item.extension_attributes.shipping_assignments[0]
                    .shipping.address.fax,
                  email:
                    item.extension_attributes.shipping_assignments[0].shipping
                      .address.email,
                  firstname:
                    item.extension_attributes.shipping_assignments[0].shipping
                      .address.firstname !== '-'
                      ? item.extension_attributes.shipping_assignments[0]
                          .shipping.address.firstname
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

              console.log(magentoOrder.items);
            }
          })
          .catch((error) => {
            getStatus = CrawlResult.FAILURE;
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno} : ${error}`,
            );
          });
      } while (getStatus === CrawlResult.FAILURE);

      console.log(`Order '${input.orderRef}' imported successfully`);

      let streets;
      let success = 0;

      do {
        await this._httpService
          .axiosRef(GET_MAGENTO_STREETS_URL)
          .then((response) => {
            success = 1;
            streets = response.data;
          })
          .catch((error) => console.log(error));
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
       * Create the new order
       */
      const order = new Order();

      order.magentoID = entity_id;
      order.reference = input.orderRef;
      order.barcode = await this._orderService.generateBarCode();
      order.version = OrderVersion.CURRENT;
      order.sellerCode =
        this._orderService.extractSellerCodeFromLabel(seller_info);
      // order.deliveryMode =
      //   this._orderService.getDeliveryMode(shipping_description);
      order.paymentMode = PaymentMode.AFTER_DELIVERY;
      order.paymentStatus = PaymentStatus.UNPAID;
      order.calculatedDeliveryFees = {
        amount: payment.shipping_amount,
        negociable: true,
      };
      order.type = OrderType.MAGENTO_ORDER;
      order.orderStatus = this._orderService.calculateOrderStatus(status);
      order.orderStep = this._orderService.calculateOrderState(
        state as MagentoOrderState,
        order.orderStatus,
      );
      order.subTotal = subtotal;
      order.total = grand_total;
      order.paymentMethod = this._orderService.calculateOrderPaymentMethod(
        payment.method,
        payment.additional_information,
      );
      order.paymentRef =
        order.paymentMethod === PaymentMethod.MOBILE_MONEY ||
        order.paymentMethod === PaymentMethod.ORANGE_MONEY
          ? payment.last_trans_id
            ? payment.last_trans_id
            : payment.additional_information[0]
          : null;
      order.comments =
        this._orderService.buildOrderCommentsFromMagentoData(status_histories);
      const { storagePoint, deliveryMode } =
        await this._orderService.getOrderStoragePointV4(
          shipping_description,
          shipping_address,
        );

      console.log('Delivery mode: ', deliveryMode);
      console.log(
        `Warehouse ${storagePoint.name} | ${shipping_description} | billing: ${billing_address.city} | shipping: ${shipping_address.city}`,
      );

      order.deliveryMode = deliveryMode;
      order.storagePoint = storagePoint;
      order.storagePointId = storagePoint.id;

      // billing_address
      const billingAddress = new Address();

      const {
        country_id,
        region,
        city,
        fax,
        email,
        firstname,
        lastname,
        telephone,
        street,
      } = billing_address;

      billingAddress.usage = AddressUsage.ORDERS_USAGE;
      billingAddress.fullName = this._orderService.getAddressFullname(
        lastname,
        firstname,
      );
      billingAddress.phone = telephone;
      billingAddress.email = email;
      billingAddress.street =
        this._sharedService.toLowerCaseAndNormalize(city) ===
          this._sharedService.toLowerCaseAndNormalize(DOUALA_CITY) ||
        this._sharedService.toLowerCaseAndNormalize(city) ===
          this._sharedService.toLowerCaseAndNormalize(YAOUNDE_CITY)
          ? this._sharedService.buildValueMapValue(
              this._orderService.getStreetByFax(fax, city, streets),
            )
          : !isNullOrWhiteSpace(street)
          ? this._sharedService.buildValueMapValue(street)
          : null;
      billingAddress.city = !isNullOrWhiteSpace(city)
        ? this._sharedService.buildValueMapValue(city)
        : null;
      billingAddress.region = !isNullOrWhiteSpace(region)
        ? this._sharedService.buildValueMapValue(region)
        : null;
      billingAddress.country = this._sharedService.buildValueMapValue(
        '',
        country_id,
      );

      await this._addressRepository.save(billingAddress);

      order.billingAddress = billingAddress;
      order.billingAddressId = billingAddress.id;

      // shipping address
      const shippingAddress = new Address();

      shippingAddress.usage = AddressUsage.ORDERS_USAGE;
      shippingAddress.fullName = this._orderService.getAddressFullname(
        shipping_address.lastname,
        shipping_address.firstname,
      );
      shippingAddress.phone = shipping_address.telephone;
      shippingAddress.email = shipping_address.email;
      shippingAddress.street =
        this._sharedService.toLowerCaseAndNormalize(shipping_address.city) ===
          this._sharedService.toLowerCaseAndNormalize(DOUALA_CITY) ||
        this._sharedService.toLowerCaseAndNormalize(shipping_address.city) ===
          this._sharedService.toLowerCaseAndNormalize(YAOUNDE_CITY)
          ? this._sharedService.buildValueMapValue(
              this._orderService.getStreetByFax(
                shipping_address.fax,
                shipping_address.city,
                streets,
              ),
            )
          : !isNullOrWhiteSpace(shipping_address.street)
          ? this._sharedService.buildValueMapValue(shipping_address.street)
          : null;
      shippingAddress.city = !isNullOrWhiteSpace(shipping_address.city)
        ? this._sharedService.buildValueMapValue(shipping_address.city)
        : null;
      shippingAddress.region = !isNullOrWhiteSpace(shipping_address.region)
        ? this._sharedService.buildValueMapValue(shipping_address.region)
        : null;
      shippingAddress.country = this._sharedService.buildValueMapValue(
        '',
        shipping_address.country_id,
      );

      await this._addressRepository.save(shippingAddress);

      order.deliveryAddress = shippingAddress;
      order.deliveryAddressId = shippingAddress.id;

      order.orderSource = this._orderService.getOrderSource(
        order.type,
        order.deliveryAddress,
        order.deliveryMode,
      );

      if (discount_amount > 0) {
        const voucher = new Voucher();

        voucher.type = DiscountType.FIXED;
        voucher.value = discount_amount;

        await this._voucherRepository.save(voucher);

        order.voucher = voucher;
        order.voucherId = voucher.id;
      }

      order.createdAt = created_at;
      order.lastUpdate = updated_at;

      await this._orderRepository.save(order);

      /**
       * Try to update order status on magento
       */
      if (UPDATE_MAGENTO_ORDER_STATUS === AllowAction.ON) {
        this._updateMagentoDataService.updateOrderStatus(
          order.magentoID,
          MagentoOrderStatus.IMPORT_FAILURE,
        );
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

        // if (product_type === 'bundle') {
        //   const skus = this._crawlArticlesService.splitBundleSKU(sku);
        //   console.log('Child Skus from bundle', skus);

        //   for (const sku of skus) {
        //     let article = await this._productVariantRepository.findOne({
        //       where: { magentoSKU: sku },
        //     });

        //     if (!article) {
        //       console.log(`"BUNDLE". Import article ${sku} from magento`);

        //       article =
        //         await this._crawlArticlesService.importSingleProduct(sku);
        //     }

        //     const articleOrdered = await this._buildArticleOrdered(
        //       item,
        //       position,
        //       order,
        //       article,
        //     );
        //     articlesOrdered.push(articleOrdered);

        //     position++;
        //   }
        // }
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
          storagePoint,
          articlesOrderedType,
        );

      console.log('Availability Status ====== ', variantsAvailabilities);

      /**
       * Get missing variants
       */
      const missingVariants = variantsAvailabilities.availabilities.filter(
        (availability) => availability.missingQty > 0,
      );

      let askVariantsToTransfert: AskVariantToTransfertModel[] = [];
      let variantsToPurchased: ProductVariantToPurchaseModel[] = [];

      // If all variants available in storage point
      if (variantsAvailabilities?.status !== AvailabilityStatus.ALL) {
        const transfertAndPurchaseProcessOutput =
          await this._orderService.transfertAndPurchaseProcess(
            missingVariants,
            storagePoint,
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
        order.orderStatus = StepStatus.TO_PICK_PACK;
        order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;
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
          transfert.target = storagePoint;
          transfert.targetId = storagePoint.id;

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
      }

      /**
       * If variantsToPurchased.lenght > 0
       * ***** Create purchaseOrder
       */
      if (variantsToPurchased.length > 0) {
        const purchaseOrder = new PurchaseOrder();

        purchaseOrder.reference =
          await this._purchaseOrderReferenceService.generate();
        purchaseOrder.storagePointId = storagePoint.id;
        purchaseOrder.storagePoint = storagePoint;
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
          variantPurchased.customPrice = order.articleOrdereds.find(
            (articleOrdered) =>
              articleOrdered.productVariantId === productVariant.id,
          ).price;

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

      await this._orderRepository.save(order);

      const orderModel = await this._orderService.buildOrderModel(order);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${SyncOrderByReferenceService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
