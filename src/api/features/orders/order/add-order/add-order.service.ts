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
  FROM_EMAIL,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { OrderItemOutput } from 'src/domain/dto/orders';
import {
  OrderProcessing,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { Address } from 'src/domain/entities/shared';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationLineState,
  StatusLine,
  StepStatus,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import {
  AvailabilityStatus,
  OrderType,
  OrderStep,
  DeliveryMode,
} from 'src/domain/enums/orders';
import { AskVariantToTransfertModel } from 'src/domain/interfaces/flows';
import {
  ProductVariantOrderedModel,
  VariantsAvailabilities,
} from 'src/domain/interfaces/orders';
import { ProductVariantToPurchaseModel } from 'src/domain/interfaces/purchases';
import { ArticlesOrderedModel } from 'src/domain/types/orders';
import {
  OrderProcessingRepository,
  TransfertRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  ArticleOrderedRepository,
  OrderRepository,
  VoucherRepository,
} from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { AddressRepository } from 'src/repositories/shared';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { CalculateDeliveryFeesService } from 'src/services/delivery-fees';
import { OrderService } from 'src/services/generals';
import { TransfertService } from 'src/services/references/flows';
import { OrderReferenceService } from 'src/services/references/orders';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SharedService, UserService } from 'src/services/utilities';
import { AddOrderInput } from './dto';
import { CommentModel, EmailInputModel } from 'src/domain/interfaces';
import {
  AdvanceModel,
  Instalment,
  InstalmentModel,
} from 'src/domain/interfaces/finance';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';
import {
  InstalmentStatus,
  InstalmentType,
  PaymentMode,
} from 'src/domain/enums/finance';
import { SendingEmailService } from 'src/services/email';
import { EmailTemplateName } from 'src/domain/enums/email';
import { DOUALA_CITY, YAOUNDE_CITY } from 'src/domain/constants';

type ValidationResult = {
  billingAddress: Address;
  deliveryAddress: Address;
  storagePoint: StoragePoint;
  globalVoucher: Voucher;
  articlesOrdered: ProductVariantOrderedModel[];
  variantsAvailabilities: VariantsAvailabilities;
  comment: CommentModel;
  instalment: Instalment;
  isGlobalVoucher: boolean;
  isComment: boolean;
  isInstalment: boolean;
  isAdvance: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ArticleOrdered)
    private readonly _articleOrderedRepository: ArticleOrderedRepository,
    @InjectRepository(Voucher)
    private readonly _voucherRepository: VoucherRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _calculateDeliveryFeesService: CalculateDeliveryFeesService,
    private readonly _sharedService: SharedService,
    private readonly _orderService: OrderService,
    private readonly _transfertReferenceService: TransfertService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _httpService: HttpService,
    // private readonly _sendingEmailService: SendingEmailService,
    private readonly _userService: UserService,
  ) {}

  async addOrder(
    input: AddOrderInput,
    user: UserCon,
    accessToken: string,
  ): Promise<OrderItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      input,
      accessToken,
      validationResult,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddOrderInput,
    accessToken: string,
    result: ValidationResult,
  ): Promise<OrderItemOutput> {
    const order = new Order();

    try {
      const {
        billingAddress,
        deliveryAddress,
        storagePoint,
        globalVoucher,
        articlesOrdered,
        variantsAvailabilities,
        comment,
        instalment,
        isGlobalVoucher,
        isComment,
        isInstalment,
        isAdvance,
        lang,
        user,
      } = result;

      console.log('Availabilities ', variantsAvailabilities.status);

      // throw new BadRequestException('debug');

      /**
       * Get order source by outputType
       */
      const orderSource = this._orderService.getOrderSource(
        input.orderType,
        deliveryAddress,
        input.deliveryMode ? input.deliveryMode : null,
      );

      if (input.orderType === OrderType.MAGENTO_ORDER) {
        order.reference = input.magentoOrderID;
      } else {
        order.reference = await this._orderReferenceService.generate(
          orderSource,
        );
      }

      order.barcode = await this._orderService.generateBarCode();
      order.sellerCode = input.sellerCode;
      order.orderSource = orderSource;
      order.deliveryMode = input.deliveryMode ? input.deliveryMode : null;
      order.paymentMethod = input.paymentMethod;
      order.paymentMode = PaymentMode.AFTER_DELIVERY;
      order.preferedDeliveryDate = input.preferredDeliveryDate;
      order.fixedDeliveryFees = input.fixedDeliveryFees
        ? input.fixedDeliveryFees
        : null;
      order.subTotal = 0;
      order.total = 0;

      order.storagePointId = storagePoint.id;
      order.storagePoint = storagePoint;

      order.billingAddressId = billingAddress.id;
      order.billingAddress = billingAddress;

      order.deliveryAddressId = deliveryAddress.id;
      order.deliveryAddress = deliveryAddress;

      order.createdBy = user;

      if (isGlobalVoucher) {
        order.voucherId = globalVoucher.id;
        order.voucher = globalVoucher;
      }

      if (isComment) {
        order.comments = [comment];
      }

      if (isInstalment) {
        order.instalment = instalment;
        if (instalment.type === InstalmentType.EN_AMONT)
          order.guarantor = input.guarantor;
        order.paymentMode = PaymentMode.INSTALMENT_PAYMENT;
      }

      await this._orderRepository.save(order);

      const articlesOrderedToAdd: ArticleOrdered[] = [];
      const articlesOrderedModel: ArticlesOrderedModel[] = [];
      const prices: number[] = [];
      let position = 0;

      for (const articleOrdered of articlesOrdered) {
        const { article, quantity, customPrice, discount } = articleOrdered;

        const articleOrderedToAdd = new ArticleOrdered();

        articleOrderedToAdd.quantity = quantity;
        articleOrderedToAdd.status = StatusLine.TO_PICK_PACK;

        if (customPrice) {
          articleOrderedToAdd.price = customPrice;
        } else {
          articleOrderedToAdd.price = article.specialPrice
            ? await this._orderService.calculateDiscount(
                article.specialPrice,
                article.salePrice,
                discount,
              )
            : article.salePrice;
        }

        if (discount) articleOrderedToAdd.discount = discount;

        articleOrderedToAdd.productVariant = article;
        articleOrderedToAdd.productVariantId = article.id;
        articleOrderedToAdd.order = order;
        articleOrderedToAdd.orderId = order.id;
        articleOrderedToAdd.totalPrice = quantity * articleOrderedToAdd.price;
        articleOrderedToAdd.position = position;
        articleOrderedToAdd.createdBy = user;

        articlesOrderedToAdd.push(articleOrderedToAdd);

        position++;

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(article);

        const locations =
          await this._sharedService.buildPickPackLocationsOutput(article);

        articlesOrderedModel.push({
          articleOrdered: articleOrderedToAdd,
          variantDetails,
          locations,
        });

        prices.push(articleOrderedToAdd.totalPrice);
      }

      await this._articleOrderedRepository.save(articlesOrderedToAdd);

      if (isAdvance) {
        let advance: AdvanceModel;
        if (input.advance) {
          advance = {
            firstPayment: input.advance,
            balance: order.total,
            history: [],
          };
        }

        order.advance = advance;
        order.paymentMode = PaymentMode.ADVANCE_PAYMENT;
      }

      /**
       * Check products disponibilities
       */
      /**
       * If outputType = DEAD_STOCK_OUTPUT or DESTOCKAGE_OUTPUT
       * If all variants available (i.e status = ALL)
       * ******* 1. orderStatus = TO_PICK_PACK
       * ******* 2. orderStep = PREPARATION_IN_PROGRESS
       */
      if (
        input.orderType === OrderType.DEAD_STOCK_ORDER ||
        input.orderType === OrderType.DESTOCKAGE_ORDER
      ) {
        if (variantsAvailabilities.status === AvailabilityStatus.ALL) {
          order.orderStatus = StepStatus.TO_PICK_PACK;
          order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;
        }
      }

      /**
       * Is outputType = ORDER_OUTPUT
       * If all variants available in storage point
       * (i.e state = AVAILABLE)
       * ******* 1. orderStatus = TO_PICK_PACK
       * ******* 2. orderStep = PREPARATION_IN_PROGRESS
       * If some variants available in storage point
       * ******* 3. orderStatus = TO_TREAT
       * ******* 4. orderStep = TREATMENT_IN_PROGRESS
       * If all variants not available
       * ******* 5. orderStatus = TO_BUY
       * ******* 6. orderStep = PURCHASE_IN_PROGRESS
       */
      if (input.orderType === OrderType.DEFAULT_ORDER) {
        /**
         * Get missing variants
         */
        const missingVariants = variantsAvailabilities.availabilities.filter(
          (availability) => availability.missingQty > 0,
        );

        let askVariantsToTransfert: AskVariantToTransfertModel[] = [];
        let variantsToPurchased: ProductVariantToPurchaseModel[] = [];

        // If all variants available in storage point
        if (variantsAvailabilities.status === AvailabilityStatus.ALL) {
          order.orderStatus = StepStatus.TO_PICK_PACK;
          order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;
        } else if (variantsAvailabilities.status === AvailabilityStatus.SOME) {
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
              storagePoint,
              input.deliveryMode,
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
        } else if (variantsAvailabilities.status === AvailabilityStatus.NONE) {
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
              storagePoint,
              input.deliveryMode,
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
          throw new InternalServerErrorException(
            `Something wrong appened !. Please try again`,
          );
        }

        // console.log('transferts ', askVariantsToTransfert);
        // console.log('purchases ', variantsToPurchased);

        /**
         * If askVariantsToTransfert.lenght > 0
         * ***** Create transferts
         */
        if (askVariantsToTransfert.length > 0) {
          await Promise.all(
            askVariantsToTransfert.map(async (askVariantToTransfert) => {
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
              transfert.createdBy = user;

              await this._transfertRepository.save(transfert);

              /**
               * Add variantsToTransfert
               */
              const variantsToTransfertToAdd: VariantTransfert[] = [];
              let transfertPosition = 0;

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

                variantTransfert.createdBy = user;

                variantsToTransfertToAdd.push(variantTransfert);
                transfertPosition++;
              });

              await this._variantTransfertRepository.save(
                variantsToTransfertToAdd,
              );

              if (order.transferts) {
                order.transferts.push(transfert);
              } else {
                order.transferts = [transfert];
              }
            }),
          );
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
          purchaseOrder.createdBy = user;

          await this._purchaseOrderRepository.save(purchaseOrder);

          /**
           * Add variantsToPurchased
           */
          const variantsToPurchasedToAdd: VariantPurchased[] = [];
          let purchasePosition = 0;

          variantsToPurchased.map((variantToPurchased) => {
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

            variantPurchased.createdBy = user;

            variantsToPurchasedToAdd.push(variantPurchased);
            purchasePosition++;
          });

          await this._variantPurchasedRepository.save(variantsToPurchasedToAdd);

          order.purchaseOrder = purchaseOrder;
        }
      }

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

      order.articleOrdereds = articlesOrderedToAdd;
      order.orderProcessings = [orderPrecessing];

      order.calculatedDeliveryFees =
        order.deliveryMode === DeliveryMode.AT_HOME
          ? await this._calculateDeliveryFeesService.calculateFees(order)
          : { amount: 0, negociable: true };

      console.log('Frais de livraison: ', order.calculatedDeliveryFees);

      /**
       * Calculate order subTotal and total
       * If not global discount
       * ******* subTotal = total = sum of articlesOrdered prices
       * If global discount
       * ******* subTotal = sum of articlesOrdered prices
       * ******* total = discount of subTotal
       */
      console.log('Prices ======================== ', prices);

      order.subTotal = prices.reduce((sum, current) => sum + current, 0);
      order.total = isGlobalVoucher
        ? await this._orderService.calculateDiscount(
            globalVoucher,
            order.subTotal,
          )
        : order.subTotal;
      order.total = order.fixedDeliveryFees
        ? order.total + order.fixedDeliveryFees
        : order.calculatedDeliveryFees.amount
        ? order.total + order.calculatedDeliveryFees.amount
        : order.total;

      console.log('TOTAUX ', order.subTotal, order.total);

      if (isInstalment) {
        /**
         * Instalments validation
         * Check if the sum of instalments corresponds
         * to the invoice amount applied at the rate
         */
        if (
          this._orderService.calculateTotalInstalments(
            instalment.instalments,
          ) !==
          this._orderService.calculateOrderTotalWithInstalementRate(
            instalment,
            order.total,
          )
        ) {
          const lastChild = instalment.instalments.pop();
          const valueToAdd = order.fixedDeliveryFees
            ? order.fixedDeliveryFees
            : order.calculatedDeliveryFees.amount
            ? order.calculatedDeliveryFees.amount
            : Math.abs(
                this._orderService.calculateOrderTotalWithInstalementRate(
                  instalment,
                  order.total,
                ) -
                  this._orderService.calculateTotalInstalments(
                    instalment.instalments,
                  ),
              );
          lastChild.value += valueToAdd;
          instalment.instalments.push(lastChild);
          order.instalment = instalment;
        }
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

      /**
       * Send the mail here
       */
      // const sendEmailTo: string[] = [];

      // const queryParams = order.purchaseOrder
      //   ? `?roles=${AgentRoles.PICK_PACK}&roles=${AgentRoles.PROCUREMENT_ASSISTANT}&roles=${AgentRoles.WAREHOUSE_MANAGER}&storagePointRef=${storagePoint.reference}`
      //   : `?roles=${AgentRoles.PICK_PACK}&roles=${AgentRoles.WAREHOUSE_MANAGER}&storagePointRef=${storagePoint.reference}`;

      // const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}${queryParams}`;
      // console.log('AUTH ENDPOINT ', path);

      // await this._httpService.axiosRef
      //   .get(path, {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //       'Accept-Encoding': 'gzip,deflate,compress',
      //     },
      //   })
      //   .then((response) => {
      //     console.log(
      //       `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
      //       'Data ',
      //       response.data,
      //     );

      //     response.data.items.map((item) => {
      //       if (item) {
      //         sendEmailTo.push(item.email);
      //       }
      //     });
      //   })
      //   .catch((error) => {
      //     throw new HttpException(
      //       error.message,
      //       HttpStatus.INTERNAL_SERVER_ERROR,
      //     );
      //   });

      const orderModel = await this._orderService.buildOrderModel(order);

      // if (sendEmailTo.length > 0) {
      //   console.log(`Send mail to ${sendEmailTo}`);

      //   const emailInput: EmailInputModel = {
      //     to: sendEmailTo,
      //     from: FROM_EMAIL,
      //     subject: `New order placed with reference ${order.reference} from ${storagePoint.name} warehouse`,
      //   };

      // try {
      //     const send = await this._sendingEmailService.sendEmailWithTemplate(
      //       emailInput,
      //       EmailTemplateName.ORDER,
      //       orderModel,
      //     );
      //     if (send) {
      //       console.log('Mail sent successfully');
      //     }
      //   }
      // } catch (error) {
      //   console.log(
      //     `Error sending email: ${error} - ${AddOrderService.name} - ${this._tryExecution.name}`,
      //   );
      // }

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      // if (order.id) {
      //   const articlesOrdered = await this._articleOrderedRepository.find({
      //     where: { orderId: order.id },
      //   });
      //   const ids: string[] = [];
      //   articlesOrdered.map((articleOrdered) => ids.push(articleOrdered.id));
      //   this._articleOrderedRepository.delete(ids);
      //   this._orderRepository.delete(order.id);
      // }
      throw new ConflictException(
        `${AddOrderService.name} - ${this._tryExecution.name}` + error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * User roles validation
       */
      if (
        input.orderType === OrderType.DEAD_STOCK_ORDER ||
        input.orderType === OrderType.DESTOCKAGE_ORDER
      ) {
        if (
          !user.roles.some(
            (role) =>
              role === AgentRoles.SUPER_ADMIN ||
              role === AgentRoles.ADMIN ||
              role === AgentRoles.STOCK_AGENT ||
              role === AgentRoles.PICK_PACK ||
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.LOGISTIC_MANAGER,
          )
        ) {
          throw new UnauthorizedException(
            `You are not authorized to create ${input.orderType}`,
          );
        }
      }

      if (
        isNullOrWhiteSpace(input.storagePointId) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN || role === AgentRoles.ADMIN,
        )
      ) {
        throw new BadRequestException(`Please provide the warehouse`);
      }

      if (
        (input.orderType === OrderType.DEFAULT_ORDER ||
          input.orderType === OrderType.MAGENTO_ORDER) &&
        !input.deliveryMode
      ) {
        throw new BadRequestException(`Please choose the order delivery mode.`);
      }

      if (
        input.orderType === OrderType.MAGENTO_ORDER &&
        isNullOrWhiteSpace(input.magentoOrderID)
      ) {
        throw new BadRequestException(
          `Magento order ID is required for ${input.orderType}`,
        );
      }

      /**
       * SellerCode validation
       */
      if (
        (input.orderType === OrderType.DEFAULT_ORDER ||
          input.orderType === OrderType.MAGENTO_ORDER) &&
        isNullOrWhiteSpace(input.sellerCode) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.WAREHOUSE_MANAGER ||
            role === AgentRoles.LOGISTIC_MANAGER,
        )
      ) {
        throw new BadRequestException(`Please provide the seller code`);
      }

      const articlesOrdered: ProductVariantOrderedModel[] = [];
      let globalVoucher: Voucher;
      let storagePoint: StoragePoint;

      const billingAddress = await this._addressRepository.findOne(
        input.billingAddressId,
      );
      if (!billingAddress) {
        throw new NotFoundException(`Billing address provided not found.`);
      }

      const deliveryAddress = await this._addressRepository.findOne(
        input.deliveryAddressId,
      );
      if (!deliveryAddress) {
        throw new NotFoundException(`Delivery address provided not found.`);
      }

      if (!isNullOrWhiteSpace(input.globalVoucherId)) {
        globalVoucher = await this._voucherRepository.findOne(
          input.globalVoucherId,
        );
        if (!globalVoucher) {
          throw new NotFoundException(`Invalid voucher code.`);
        }
      }

      if (!isNullOrWhiteSpace(input.storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: input.storagePointId },
          relations: ['address'],
        });
        if (!storagePoint) {
          throw new NotFoundException(
            `Storage point '${input.storagePointId}' not found`,
          );
        }
      } else {
        storagePoint = await this._storagePointRepository.findOne({
          where: {
            reference: user.workStation?.warehouse?.reference,
          },
          relations: ['address'],
        });

        if (!storagePoint) {
          throw new InternalServerErrorException(
            `An error occured. Please check user credentials`,
          );
        }
      }

      const variantsAvailabilities =
        await this._orderService.checkVariantsAvailabilities(
          input.orderType,
          storagePoint,
          input.articlesOrdered,
        );

      /**
       * If outputType = DEAD_STOCK_OUTPUT or DESTOCKAGE_OUTPUT
       * If all variants available
       * If not reject order
       */
      if (
        (input.orderType === OrderType.DEAD_STOCK_ORDER ||
          input.orderType === OrderType.DESTOCKAGE_ORDER) &&
        variantsAvailabilities.status !== AvailabilityStatus.ALL
      ) {
        throw new BadRequestException(
          `Some products you choose are not available in the DEAD area of '${storagePoint.name}' warehouse`,
        );
      }

      /**
       * Instalment and advance validation
       */
      if (input.instalment && input.advance) {
        throw new BadRequestException(
          `Cannot create order with instalment and advance`,
        );
      }

      if (
        input.instalment &&
        input.instalment.type === InstalmentType.EN_AVAL &&
        !input.guarantor
      ) {
        throw new BadRequestException(
          `Please provide a guarantor for instalment payment`,
        );
      }

      if (
        input.advance &&
        (Number.isNaN(input.advance) || input.advance <= 0)
      ) {
        throw new BadRequestException(
          `Invalid advance amount: ${input.advance}`,
        );
      }

      if (input.instalment) {
        const { type, taux, instalments } = input.instalment;

        if (instalments.length > 4) {
          throw new BadRequestException(
            `You cannot defined more than 4 instructions`,
          );
        }

        if (Number.isNaN(taux) || taux < 0) {
          throw new BadRequestException(
            `Invalid instalment rate: ${input.instalment.taux}`,
          );
        }
      }

      await Promise.all(
        input.articlesOrdered.map(async (articleOrdered) => {
          const { articleRef, quantity, customPrice, discount } =
            articleOrdered;

          const article = await this._productVariantRepository.findOne(
            { reference: articleRef },
            { relations: ['product', 'attributeValues', 'productItems'] },
          );
          if (!article) {
            throw new NotFoundException(`Article '${articleRef}' not found.`);
          }

          article.product = await this._productRepository.findOne(
            article.productId,
            { relations: ['categories'] },
          );

          if (Number.isNaN(quantity) || quantity <= 0) {
            throw new HttpException(
              `Invalid fields: quantity ${quantity}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          if (customPrice && (Number.isNaN(customPrice) || customPrice < 0)) {
            throw new HttpException(
              `Invalid fields: price ${customPrice}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          if (discount && (Number.isNaN(discount) || discount <= 0)) {
            throw new HttpException(
              `Invalid fields: discount ${discount}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          if (customPrice && discount) {
            throw new BadRequestException(
              `Cannot ste price and add a discount at the same time`,
            );
          }

          articlesOrdered.push({ article, quantity, customPrice, discount });
        }),
      );

      let comment: CommentModel;
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comment = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };
      }

      let instalment: Instalment;
      if (input.instalment) {
        const { type, taux, instalments } = input.instalment;

        const instalmentValues: InstalmentModel[] = [];
        let position = 0;
        instalments.forEach((instalment) => {
          const { value, deadline } = instalment;
          const instalmentValue: InstalmentModel = {
            position,
            status: InstalmentStatus.UNPAID,
            value,
            deadline,
          };
          instalmentValues.push(instalmentValue);
          position++;
        });

        instalment = {
          taux,
          type,
          balance: 0,
          instalments: instalmentValues,
        };
      }

      // /**
      //  * Get the guarantor if exist
      //  */
      // let guarantor: MiniUserPayload;

      // if (!isNullOrWhiteSpace(input.guarantor)) {
      //   // Get the user from auth microservice
      //   const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
      //   console.log('AUTH ENDPOINT ', path);

      //   await this._httpService.axiosRef
      //     .get(path + `/${input.guarantor}`, {
      //       headers: { Authorization: `Bearer ${accessToken}` },
      //     })
      //     .then((response) => {
      //       console.log(
      //         `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
      //         'Data ',
      //         response.data,
      //       );

      //       guarantor = {
      //         firstname: response.data.firstname
      //           ? response.data.firstname
      //           : null,
      //         lastname: response.data.lastname,
      //         email: response.data.email,
      //       };
      //     })
      //     .catch((error) => {
      //       throw new HttpException(
      //         error.message,
      //         HttpStatus.INTERNAL_SERVER_ERROR,
      //       );
      //     });
      // }

      return {
        billingAddress,
        deliveryAddress,
        storagePoint,
        globalVoucher,
        articlesOrdered,
        variantsAvailabilities,
        comment,
        instalment,
        isGlobalVoucher: !!globalVoucher,
        isComment: !!comment,
        isInstalment: !!input.instalment,
        isAdvance: !!input.advance,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
