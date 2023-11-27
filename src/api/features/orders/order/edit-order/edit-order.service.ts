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
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import {
  ArticleOrderedRepository,
  OrderRepository,
  VoucherRepository,
} from 'src/repositories/orders';
import { EditOrderInput } from './dto';
import {
  AgentRoles,
  FROM_EMAIL,
  ISOLang,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { Address } from 'src/domain/entities/shared';
import {
  CommentModel,
  EmailInputModel,
  MiniUserPayload,
} from 'src/domain/interfaces';
import {
  AdvanceModel,
  Instalment,
  InstalmentModel,
} from 'src/domain/interfaces/finance';
import {
  OrderChangesToApplyModel,
  ProductVariantOrderedModel,
  VariantsAvailabilities,
} from 'src/domain/interfaces/orders';
import {
  InstalmentStatus,
  InstalmentType,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { AddressRepository } from 'src/repositories/shared';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  OrderProcessing,
  Reception,
  Transfert,
  VariantReception,
  VariantTransfert,
} from 'src/domain/entities/flows';
import {
  OrderProcessingRepository,
  ReceptionRepository,
  TransfertRepository,
  VariantReceptionRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import {
  OrderService,
  ProductVariantService,
  ProductsService,
} from 'src/services/generals';
import {
  AvailabilityStatus,
  DeliveryMode,
  OrderChangesAppliedStatus,
  OrderSensitivesData,
  OrderStep,
  OrderType,
  OrderVersion,
  ToBeCashed,
} from 'src/domain/enums/orders';
import { CalculateDeliveryFeesService } from 'src/services/delivery-fees';
import { OrderReferenceService } from 'src/services/references/orders';
import {
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StatusLine,
  StepStatus,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import { SharedService, UserService } from 'src/services/utilities';
import { ArticlesOrderedModel } from 'src/domain/types/orders';
import {
  ReceptionService,
  TransfertService,
} from 'src/services/references/flows';
import { ProductVariantToReceivedModel } from 'src/domain/interfaces/flows';
import {
  SetProductQuantityModel,
  SetVariantQuantityModel,
} from 'src/domain/interfaces/items';
import { UpdatedType } from 'src/domain/enums/warehouses';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import { SendingEmailService } from 'src/services/email';
import { HttpService } from '@nestjs/axios';
import {
  DOUALA_CITY,
  USERS_RESOURCE,
  YAOUNDE_CITY,
} from 'src/domain/constants';
import { EmailTemplateName } from 'src/domain/enums/email';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { VariantItemsModel } from 'src/domain/interfaces/i.variant-items.model';

type ValidationResult = {
  order: Order;
  billingAddress: Address;
  deliveryAddress: Address;
  globalVoucher: Voucher;
  comments: CommentModel[];
  instalment: Instalment;
  advance: AdvanceModel;
  storagePoint: StoragePoint;
  hostStoragePoint: StoragePoint;
  articlesOrderedToAdd: ProductVariantOrderedModel[];
  articlesOrderedToRemove: ArticleOrdered[];
  articlesOrderedToEdit: ProductVariantOrderedModel[];
  dataChanged: OrderSensitivesData[];
  variantsAvailabilities: VariantsAvailabilities;
  orderTotal: number;
  isBillingAddressChange: boolean;
  isDeliveryAddressChange: boolean;
  isGlobalVoucher: boolean;
  isNewComment: boolean;
  isInstalment: boolean;
  isAdvance: boolean;
  isNewGuarantor: boolean;
  isStoragePointChange: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ArticleOrdered)
    private readonly _articleOrderedRepository: ArticleOrderedRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    @InjectRepository(Voucher)
    private readonly _voucherRepository: VoucherRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
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
    private readonly _orderService: OrderService,
    private readonly _calculateDeliveryFeesService: CalculateDeliveryFeesService,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _sharedService: SharedService,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _productVariantService: ProductVariantService,
    private readonly _productService: ProductsService,
    private readonly _sendingEmailService: SendingEmailService,
    private readonly _httpService: HttpService,
    private readonly _userService: UserService,
    private readonly _transfertReferenceService: TransfertService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
  ) {}

  async editOrder(
    input: EditOrderInput,
    user: UserCon,
    accessToken: string,
  ): Promise<OrderItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      validationResult,
      input,
      accessToken,
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
    result: ValidationResult,
    input: EditOrderInput,
    accessToken: string,
  ): Promise<OrderItemOutput> {
    try {
      const {
        order,
        billingAddress,
        deliveryAddress,
        globalVoucher,
        comments,
        instalment,
        advance,
        storagePoint,
        hostStoragePoint,
        articlesOrderedToAdd,
        articlesOrderedToRemove,
        articlesOrderedToEdit,
        dataChanged,
        variantsAvailabilities,
        orderTotal,
        isBillingAddressChange,
        isDeliveryAddressChange,
        isGlobalVoucher,
        isNewComment,
        isInstalment,
        isAdvance,
        isNewGuarantor,
        isStoragePointChange,
        lang,
        user,
      } = result;

      const {
        sellerCode,
        deliveryMode,
        paymentMethod,
        paymentMode,
        paymentRef,
        preferredDeliveryDate,
        fixedDeliveryFees,
        ...data
      } = input;

      let previousVersionId: string;

      if (dataChanged.length > 0) {
        const previous = new Order();

        previous.reference =
          await this._orderReferenceService.generateVersionRef(order);
        previous.barcode = await this._orderService.generateBarCode();
        previous.version = OrderVersion.PREVIOUS;
        previous.type = order.type;
        previous.sourceId = order.id;
        previous.sellerCode = order.sellerCode;
        previous.orderSource = order.orderSource;
        previous.deliveryMode = order.deliveryMode;
        previous.paymentMethod = order.paymentMethod;
        previous.preferedDeliveryDate = order.preferedDeliveryDate;
        previous.fixedDeliveryFees = order.fixedDeliveryFees;
        previous.calculatedDeliveryFees = order.calculatedDeliveryFees;
        previous.subTotal = order.subTotal;
        previous.total = order.total;
        previous.storagePointId = order.storagePointId;
        previous.storagePoint = order.storagePoint;
        previous.billingAddressId = order.billingAddressId;
        previous.billingAddress = order.billingAddress;
        previous.deliveryAddressId = order.deliveryAddressId;
        previous.deliveryAddress = order.deliveryAddress;
        previous.createdBy = order.createdBy;
        previous.voucherId = order.voucherId;
        previous.voucher = order.voucher;
        previous.comments = order.comments;
        previous.instalment = order.instalment;
        previous.guarantor = order.guarantor;
        previous.guarantor = order.guarantor;
        previous.advance = order.advance;
        previous.productItems = order.productItems;

        await this._orderRepository.save(previous);

        previousVersionId = previous.id;

        const currentArticlesOrdered: ArticleOrdered[] = [];
        await Promise.all(
          order.articleOrdereds.map(async (articleOrdered) => {
            const article = await this._productVariantRepository.findOne({
              where: { id: articleOrdered.productVariantId },
            });

            const previousArticleOrdered = new ArticleOrdered();

            previousArticleOrdered.quantity = articleOrdered.quantity;
            previousArticleOrdered.status = articleOrdered.status;
            previousArticleOrdered.price = articleOrdered.price;
            previousArticleOrdered.discount = articleOrdered.discount;
            previousArticleOrdered.productVariant = article;
            previousArticleOrdered.productVariantId = article.id;
            previousArticleOrdered.order = previous;
            previousArticleOrdered.orderId = previous.id;
            previousArticleOrdered.totalPrice = articleOrdered.totalPrice;
            previousArticleOrdered.position = articleOrdered.position;
            previousArticleOrdered.createdBy = articleOrdered.createdBy;

            currentArticlesOrdered.push(previousArticleOrdered);
          }),
        );

        await this._articleOrderedRepository.save(currentArticlesOrdered);
      }

      let orderMustChangeStatus = false;

      if (sellerCode && !isNullOrWhiteSpace(sellerCode)) {
        order.sellerCode = sellerCode;
      }

      if (deliveryMode && !isNullOrWhiteSpace(deliveryMode)) {
        order.deliveryMode = deliveryMode;
        order.orderSource = this._orderService.getOrderSourceFromDeliveryMode(
          deliveryMode,
          deliveryAddress,
        );
      }

      if (paymentMode && !isNullOrWhiteSpace(paymentMode)) {
        order.paymentMode = paymentMode;

        if (paymentMode === PaymentMode.BEFORE_DELIVERY) {
          order.paymentStatus = PaymentStatus.PAID;
          order.beforeDeliveryPayment = {
            savedAt: new Date(),
            savedBy: this._userService.buildMiniUserPayload(user),
          };
          order.toBeCashed = ToBeCashed.YES;
        }
      }

      if (paymentMethod && !isNullOrWhiteSpace(paymentMethod)) {
        order.paymentMethod = paymentMethod;
      }

      if (paymentRef && !isNullOrWhiteSpace(paymentRef)) {
        order.paymentRef = paymentRef;
      }

      if (preferredDeliveryDate) {
        order.preferedDeliveryDate = preferredDeliveryDate;
      }

      if (fixedDeliveryFees) {
        order.fixedDeliveryFees = fixedDeliveryFees;
      }

      if (isBillingAddressChange) {
        order.billingAddress = billingAddress;
        order.billingAddressId = billingAddress.id;
      }

      if (isGlobalVoucher) {
        order.voucherId = globalVoucher.id;
        order.voucher = globalVoucher;
      }

      if (isNewComment) {
        order.comments = comments;
      }

      if (isInstalment) {
        order.instalment = instalment;
        order.paymentMode = PaymentMode.INSTALMENT_PAYMENT;

        if (isNewGuarantor) {
          order.guarantor = input.guarantor;
        }
      }

      if (isAdvance) {
        order.advance = advance;
        order.paymentMode = PaymentMode.ADVANCE_PAYMENT;
      }

      if (isDeliveryAddressChange) {
        order.deliveryAddress = deliveryAddress;
        order.deliveryAddressId = deliveryAddress.id;
      }

      if (
        deliveryMode ||
        isDeliveryAddressChange ||
        articlesOrderedToAdd.length > 0 ||
        articlesOrderedToRemove.length > 0 ||
        articlesOrderedToEdit.length > 0
      ) {
        // Update calculated delivery fees
        // rebuild articlesOrdered
        const articlesOrdered: ArticleOrdered[] = [];

        for (const articleOrdered of order.articleOrdereds) {
          const articleOrderedLine =
            await this._articleOrderedRepository.findOne({
              where: { id: articleOrdered.id },
              relations: ['productVariant'],
            });

          articleOrderedLine.productVariant.product =
            await this._productRepository.findOne({
              where: { id: articleOrderedLine.productVariant.productId },
              relations: ['categories'],
            });

          articlesOrdered.push(articleOrderedLine);
        }

        order.articleOrdereds = articlesOrdered;

        order.calculatedDeliveryFees =
          order.deliveryMode === DeliveryMode.IN_AGENCY
            ? await this._calculateDeliveryFeesService.calculateFees(order)
            : { amount: 0, negociable: true };
        console.log('Frais de livraison: ', order.calculatedDeliveryFees);
      }

      const articlesOrderedToKeep: ArticleOrdered[] = [];
      const articlesOrderedModel: ArticlesOrderedModel[] = [];
      const productItemsToRemove: ProductItem[] = [];
      const prices: number[] = [];
      let position = 0;

      if (articlesOrderedToAdd.length > 0) {
        orderMustChangeStatus = true;

        await Promise.all(
          articlesOrderedToAdd.map(async (articleOrderedToAdd) => {
            const { article, quantity, customPrice, discount } =
              articleOrderedToAdd;

            const newArticleOrdered = new ArticleOrdered();

            newArticleOrdered.quantity = quantity;
            newArticleOrdered.status = StatusLine.TO_PICK_PACK;

            if (customPrice) {
              newArticleOrdered.price = customPrice;
            } else {
              newArticleOrdered.price = article.specialPrice
                ? await this._orderService.calculateDiscount(
                    article.specialPrice,
                    article.salePrice,
                    discount,
                  )
                : article.salePrice;
            }

            if (discount) newArticleOrdered.discount = discount;

            newArticleOrdered.productVariant = article;
            newArticleOrdered.productVariantId = article.id;
            newArticleOrdered.order = order;
            newArticleOrdered.orderId = order.id;
            newArticleOrdered.totalPrice = quantity * newArticleOrdered.price;
            newArticleOrdered.position = position;
            newArticleOrdered.createdBy = user;

            articlesOrderedToKeep.push(newArticleOrdered);

            position++;

            const variantDetails =
              await this._sharedService.buildPartialVariantOutput(article);

            const locations =
              await this._sharedService.buildPickPackLocationsOutput(article);

            articlesOrderedModel.push({
              articleOrdered: newArticleOrdered,
              variantDetails,
              locations,
            });

            prices.push(newArticleOrdered.totalPrice);
          }),
        );
      }

      if (articlesOrderedToEdit.length > 0) {
        for (const articleOrderedToEdit of articlesOrderedToEdit) {
          const { article, quantity, customPrice, discount } =
            articleOrderedToEdit;

          const updatedArticleOrdered = order.articleOrdereds.find(
            (line) => line.productVariantId === article.id,
          );

          updatedArticleOrdered.quantity = quantity;

          if (customPrice || customPrice === 0) {
            updatedArticleOrdered.price = customPrice;
          }

          if (discount) {
            updatedArticleOrdered.discount = discount;
          }

          updatedArticleOrdered.totalPrice =
            quantity * updatedArticleOrdered.price;
          updatedArticleOrdered.position = position;

          articlesOrderedToKeep.push(updatedArticleOrdered);

          const articleItems = order.productItems.filter(
            (item) => item.productVariantId === article.id,
          );

          if (articleItems.length < quantity) {
            orderMustChangeStatus = true;
          }

          if (articleItems.length > quantity) {
            const offset = articleItems.length - quantity;
            let start = 0;
            articleItems.forEach((item) => {
              start++;
              if (start <= offset) {
                productItemsToRemove.push(item);
              }
            });
          }

          position++;

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(article);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(article);

          articlesOrderedModel.push({
            articleOrdered: updatedArticleOrdered,
            variantDetails,
            locations,
          });

          prices.push(updatedArticleOrdered.totalPrice);
        }
      }

      if (articlesOrderedToAdd.length > 0 || articlesOrderedToEdit.length > 0) {
        await this._articleOrderedRepository.save(articlesOrderedToKeep);

        order.articleOrdereds = articlesOrderedToKeep;
      }

      if (articlesOrderedToRemove.length > 0) {
        const idsToDelete: string[] = [];
        articlesOrderedToRemove.forEach((articleOrderedToRemove) => {
          const productItems = order.productItems.filter(
            (item) =>
              item.productVariantId === articleOrderedToRemove.productVariantId,
          );
          let start = 0;
          productItems.forEach((item) => {
            start++;
            if (start <= articleOrderedToRemove.quantity) {
              productItemsToRemove.push(item);
            }
          });
          idsToDelete.push(articleOrderedToRemove.id);
        });

        this._articleOrderedRepository.delete(idsToDelete);
      }

      if (dataChanged.length > 0) {
        dataChanged.forEach((changeItem) => {
          const newPosition = order.changesToApply
            ? order.changesToApply.length
            : 0;
          const changedBy: MiniUserPayload = {
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
          };

          const newChangeToApply: OrderChangesToApplyModel = {
            position: newPosition,
            status: OrderChangesAppliedStatus.PENDING,
            dataChanged: changeItem,
            previousVersionId,
            changedBy,
            changedAt: new Date(),
          };

          if (order.changesToApply && order.changesToApply.length > 0) {
            const item = order.changesToApply.find(
              (item) => item.dataChanged === changeItem,
            );
            if (item) {
              order.changesToApply.map((change) => {
                if (change.dataChanged === changeItem) {
                  change.status = OrderChangesAppliedStatus.PENDING;
                }
                return change;
              });
            } else {
              order.changesToApply.push(newChangeToApply);
            }
          } else {
            order.changesToApply = [newChangeToApply];
          }
        });

        /**
         * Send the mail here
         */
        const sendEmailTo: string[] = [];
        const roles: AgentRoles[] = [];
        if (
          dataChanged.find(
            (change) => change === OrderSensitivesData.STORAGE_POINT,
          )
        ) {
          roles.push(AgentRoles.WAREHOUSE_MANAGER);
        }

        if (
          dataChanged.find(
            (change) => change === OrderSensitivesData.DELIVERY_FEES,
          )
        ) {
          roles.push(AgentRoles.LOGISTIC_MANAGER);
        }

        if (
          dataChanged.find(
            (change) => change === OrderSensitivesData.PRODUCT_PRICE,
          )
        ) {
          roles.push(...[AgentRoles.DAF, AgentRoles.PUS_COORDINATOR]);
        }

        let pos = 0;
        let rolesQueryParams: string;
        roles.forEach((role) => {
          if (pos === 0) {
            rolesQueryParams = `?roles=${role}`;
          } else {
            rolesQueryParams += `&roles=${role}`;
          }
          pos++;
        });

        const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}${rolesQueryParams}`;
        console.log('AUTH ENDPOINT ', path);

        await this._httpService.axiosRef
          .get(path, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          })
          .then((response) => {
            console.log(
              `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
              'Data ',
              response.data,
            );

            response.data.items.map((item) => {
              if (item) {
                sendEmailTo.push(item.email);
              }
            });
          })
          .catch((error) => {
            throw new HttpException(
              error.message,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          });

        if (sendEmailTo.length > 0) {
          console.log(`Send mail to ${sendEmailTo}`);

          const emailInput: EmailInputModel = {
            to: sendEmailTo,
            from: FROM_EMAIL,
            subject: `Changes made by ${user.lastname} to the order '${order.reference}' are awaiting validation`,
          };

          try {
            const send = await this._sendingEmailService.sendEmailWithTemplate(
              emailInput,
              EmailTemplateName.DEFAULT,
              order,
            );

            if (send) {
              console.log('Mail sent successfully');
            }
          } catch (error) {
            console.log(
              `Error sending email: ${error} - ${EditOrderService.name} - ${this._tryExecution.name}`,
            );
          }
        }
      } else {
        // update productItems status and state
        // update products and variants quantities
        // create items stock movements (products removed and edited quantity)
        // create new receptions (products removed and edited quantity)
        if (productItemsToRemove.length > 0) {
          const reception = new Reception();

          reception.reference =
            await this._receptionReferenceService.generateReference();
          reception.type = ReceptionType.UPDATED_ORDER;
          reception.status = OperationStatus.PENDING;
          reception.order = order;
          reception.orderId = order.id;

          reception.storagePoint = hostStoragePoint;
          reception.storagePointId = hostStoragePoint.id;

          await this._receptionRepository.save(reception);

          const variantsToReceivedToAdd: VariantReception[] = [];
          const variantsToReceived: ProductVariantToReceivedModel[] = [];
          const variantsToEditQuantities: SetVariantQuantityModel[] = [];
          const productsToEditQuantities: SetProductQuantityModel[] = [];

          await Promise.all(
            productItemsToRemove.map(async (itemToRemove) => {
              reception.productItems.push(itemToRemove);

              const variant = await this._productVariantRepository.findOne({
                where: { id: itemToRemove.productVariantId },
              });

              const product = await this._productRepository.findOne({
                where: { id: variant.productId },
              });

              const qtyPropertyToRemove =
                this._sharedService.getQuantityProperty(itemToRemove.state);

              // Remove
              // Variant
              let removeVariantLine = variantsToEditQuantities.find(
                (line) =>
                  line.variant.id === variant.id &&
                  line.property === qtyPropertyToRemove,
              );

              if (removeVariantLine) {
                variantsToEditQuantities.map((line) => {
                  if (
                    line.variant.id === variant.id &&
                    line.property === qtyPropertyToRemove
                  ) {
                    line.quantity += 1;
                  }
                  return line;
                });
              } else {
                removeVariantLine = {
                  variant,
                  quantity: 1,
                  type: UpdatedType.REMOVE,
                  property: qtyPropertyToRemove,
                };
                variantsToEditQuantities.push(removeVariantLine);
              }

              // product
              let removeProductLine = productsToEditQuantities.find(
                (line) =>
                  line.product.id === product.id &&
                  line.property === qtyPropertyToRemove,
              );

              if (removeProductLine) {
                productsToEditQuantities.map((line) => {
                  if (
                    line.product.id === product.id &&
                    line.property === qtyPropertyToRemove
                  ) {
                    line.quantity += 1;
                  }
                  return line;
                });
              } else {
                removeProductLine = {
                  product,
                  quantity: 1,
                  type: UpdatedType.REMOVE,
                  property: qtyPropertyToRemove,
                };
                productsToEditQuantities.push(removeProductLine);
              }

              // Add
              // Variant
              let addedVariantLine = variantsToEditQuantities.find(
                (line) =>
                  line.variant.id === variant.id &&
                  line.property === QuantityProprety.PENDING_RECEPTION,
              );

              if (addedVariantLine) {
                variantsToEditQuantities.map((line) => {
                  if (
                    line.variant.id === variant.id &&
                    line.property === QuantityProprety.PENDING_RECEPTION
                  ) {
                    line.quantity += 1;
                  }
                  return line;
                });
              } else {
                addedVariantLine = {
                  variant,
                  quantity: 1,
                  type: UpdatedType.ADD,
                  property: qtyPropertyToRemove,
                };
                variantsToEditQuantities.push(addedVariantLine);
              }

              // product
              let addedProductLine = productsToEditQuantities.find(
                (line) =>
                  line.product.id === product.id &&
                  line.property === QuantityProprety.PENDING_RECEPTION,
              );

              if (addedProductLine) {
                productsToEditQuantities.map((line) => {
                  if (
                    line.product.id === product.id &&
                    line.property === QuantityProprety.PENDING_RECEPTION
                  ) {
                    line.quantity += 1;
                  }
                  return line;
                });
              } else {
                addedProductLine = {
                  product,
                  quantity: 1,
                  type: UpdatedType.ADD,
                  property: QuantityProprety.PENDING_RECEPTION,
                };
                productsToEditQuantities.push(addedProductLine);
              }

              itemToRemove.state = ItemState.PENDING_RECEPTION;
              itemToRemove.status = StepStatus.TO_RECEIVED;

              let variantToReceivedLine = variantsToReceived.find(
                (variantToReceived) =>
                  variantToReceived.productVariant.id === variant.id,
              );

              if (variantToReceivedLine) {
                variantsToReceived.map((line) => {
                  if (line.productVariant.id === variant.id) {
                    line.quantity += 1;
                  }
                  return line;
                });
              } else {
                variantToReceivedLine = {
                  productVariant: variant,
                  purchaseCost: variant.purchaseCost,
                  quantity: 1,
                };

                variantsToReceived.push(variantToReceivedLine);
              }

              return itemToRemove;
            }),
          );

          await this._productItemRepository.save(productItemsToRemove);

          /**
           * Set Variants quantities
           */
          const variantsToEdit: ProductVariant[] = [];

          variantsToEditQuantities.map((variantLine) => {
            const { variant, quantity, type, property: proprety } = variantLine;

            const variantToEdit =
              this._productVariantService.setVariantQuantity(
                variant,
                quantity,
                type,
                proprety,
              );

            variantsToEdit.push(variantToEdit);
          });

          await this._productVariantRepository.save(variantsToEdit);

          /**
           * Set Products quantities
           */
          const productsToEdit: Product[] = [];

          productsToEditQuantities.map((productLine) => {
            const { product, quantity, type, property: proprety } = productLine;

            const productToEdit = this._productService.setProductQuantity(
              product,
              quantity,
              type,
              proprety,
            );

            productsToEdit.push(productToEdit);
          });

          await this._productRepository.save(productsToEdit);

          let variantReceptionPosition = 0;
          await Promise.all(
            variantsToReceived.map(async (variantToReceived) => {
              const { productVariant, quantity, purchaseCost, supplier } =
                variantToReceived;

              const variantReception = new VariantReception();

              variantReception.productVariant = productVariant;
              variantReception.variantId = productVariant.id;
              variantReception.reception = reception;
              variantReception.receptionId = reception.id;
              variantReception.quantity = quantity;
              variantReception.position = variantReceptionPosition;
              variantReception.state = OperationLineState.PENDING;

              variantsToReceivedToAdd.push(variantReception);
              variantReceptionPosition++;
            }),
          );

          await this._variantReceptionRepository.save(variantsToReceivedToAdd);
          reception.variantReceptions = variantsToReceivedToAdd;
          await this._receptionRepository.save(reception);
        }
      }

      if (isStoragePointChange) {
        order.storagePointId = storagePoint.id;
        order.storagePoint = storagePoint;

        if (user.roles.find((role) => role === AgentRoles.WAREHOUSE_MANAGER)) {
          if (
            order.orderStatus === StepStatus.READY ||
            order.orderStatus === StepStatus.TO_DELIVER ||
            order.orderStatus === StepStatus.PICKED_UP ||
            order.orderStatus === StepStatus.ASSIGNED ||
            order.orderStatus === StepStatus.TO_RECEIVED
          ) {
            if (variantsAvailabilities.status === AvailabilityStatus.ALL) {
              order.orderStatus = StepStatus.TO_PICK_PACK;
              order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;

              const reception = new Reception();

              reception.reference =
                await this._receptionReferenceService.generateReference();
              reception.type = ReceptionType.UPDATED_ORDER;
              reception.status = OperationStatus.PENDING;
              reception.storagePoint = hostStoragePoint;
              reception.storagePointId = hostStoragePoint.id;

              await this._receptionRepository.save(reception);

              const variantsToReceived: VariantItemsModel[] = [];
              const productItemsToEdit: ProductItem[] = [];
              const variantsToEditQuantities: SetVariantQuantityModel[] = [];
              const productsToEditQuantities: SetProductQuantityModel[] = [];

              if (order.productItems.length > 0) {
                await Promise.all(
                  order.productItems.map(async (productItem) => {
                    // Get product variant and product
                    const productVariant =
                      await this._productVariantRepository.findOne({
                        where: { id: productItem.productVariantId },
                      });

                    if (!productVariant) {
                      throw new BadRequestException(
                        `Something wrong happened. Please try again`,
                      );
                    }

                    const productToUpdate =
                      await this._productRepository.findOneOrFail({
                        where: { id: productVariant.productId },
                      });

                    /**
                     * Set product-item variants to received array
                     */
                    let variantToReceivedLine = variantsToReceived.find(
                      (line) => line.variant.id === productVariant.id,
                    );

                    if (!variantToReceivedLine) {
                      variantToReceivedLine = {
                        variant: productVariant,
                        quantity: 1,
                      };

                      variantsToReceived.push(variantToReceivedLine);
                    } else {
                      variantsToReceived.map((line) => {
                        if (
                          line.variant.id === variantToReceivedLine.variant.id
                        ) {
                          line.quantity += 1;
                        }

                        return line;
                      });
                    }

                    /**
                     * Set product and variant quantities
                     */

                    // Get current line state
                    const qtyPropertyToRemove =
                      this._sharedService.getQuantityProperty(
                        productItem.state,
                      );

                    //Add
                    // Variant
                    let addedVariantLine = variantsToEditQuantities.find(
                      (line) =>
                        line.variant.id === productVariant.id &&
                        line.property === QuantityProprety.PENDING_RECEPTION,
                    );

                    if (!addedVariantLine) {
                      addedVariantLine = {
                        variant: productVariant,
                        quantity: 1,
                        type: UpdatedType.ADD,
                        property: QuantityProprety.PENDING_RECEPTION,
                      };

                      variantsToEditQuantities.push(addedVariantLine);
                    } else {
                      variantsToEditQuantities.map((line) => {
                        if (
                          line.variant.id === addedVariantLine.variant.id &&
                          line.property === QuantityProprety.PENDING_RECEPTION
                        ) {
                          line.quantity += 1;
                        }

                        return line;
                      });
                    }

                    // Remove
                    // Variant
                    let removeVariantLine = variantsToEditQuantities.find(
                      (line) =>
                        line.variant.id === productVariant.id &&
                        line.property === qtyPropertyToRemove,
                    );

                    if (!removeVariantLine) {
                      removeVariantLine = {
                        variant: productVariant,
                        quantity: 1,
                        type: UpdatedType.REMOVE,
                        property: qtyPropertyToRemove,
                      };

                      variantsToEditQuantities.push(removeVariantLine);
                    } else {
                      variantsToEditQuantities.map((line) => {
                        if (
                          line.variant.id === removeVariantLine.variant.id &&
                          line.property === qtyPropertyToRemove
                        ) {
                          line.quantity -= 1;
                        }

                        return line;
                      });
                    }

                    //Add
                    // Product
                    let addedProductLine = productsToEditQuantities.find(
                      (line) =>
                        line.product.id === productToUpdate.id &&
                        line.property === QuantityProprety.PENDING_RECEPTION,
                    );

                    if (!addedProductLine) {
                      addedProductLine = {
                        product: productToUpdate,
                        quantity: 1,
                        type: UpdatedType.ADD,
                        property: QuantityProprety.PENDING_RECEPTION,
                      };

                      productsToEditQuantities.push(addedProductLine);
                    } else {
                      productsToEditQuantities.map((line) => {
                        if (
                          line.product.id === addedProductLine.product.id &&
                          line.property === QuantityProprety.PENDING_RECEPTION
                        ) {
                          line.quantity += 1;
                        }

                        return line;
                      });
                    }

                    // Remove
                    // Product
                    let removeProductLine = productsToEditQuantities.find(
                      (line) =>
                        line.product.id === productToUpdate.id &&
                        line.property === qtyPropertyToRemove,
                    );

                    if (!removeProductLine) {
                      removeProductLine = {
                        product: productToUpdate,
                        quantity: 1,
                        type: UpdatedType.REMOVE,
                        property: qtyPropertyToRemove,
                      };

                      productsToEditQuantities.push(removeProductLine);
                    } else {
                      productsToEditQuantities.map((line) => {
                        if (
                          line.product.id === removeProductLine.product.id &&
                          line.property === qtyPropertyToRemove
                        ) {
                          line.quantity -= 1;
                        }

                        return line;
                      });
                    }

                    productItem.state = ItemState.PENDING_RECEPTION;
                    productItem.status = StepStatus.TO_RECEIVED;
                    productItem.receptionId = reception.id;
                    productItem.reception = reception;

                    productItemsToEdit.push(productItem);
                  }),
                );
              }

              await this._productItemRepository.save(productItemsToEdit);

              /**
               * Set Variants quantities
               */
              const variantsToEdit: ProductVariant[] = [];

              variantsToEditQuantities.map((variantLine) => {
                const {
                  variant,
                  quantity,
                  type,
                  property: proprety,
                } = variantLine;

                const variantToEdit =
                  this._productVariantService.setVariantQuantity(
                    variant,
                    quantity,
                    type,
                    proprety,
                  );

                variantsToEdit.push(variantToEdit);
              });

              await this._productVariantRepository.save(variantsToEdit);

              /**
               * Set Products quantities
               */
              const productsToEdit: Product[] = [];

              productsToEditQuantities.map((productLine) => {
                const {
                  product,
                  quantity,
                  type,
                  property: proprety,
                } = productLine;

                const productToEdit = this._productService.setProductQuantity(
                  product,
                  quantity,
                  type,
                  proprety,
                );

                productsToEdit.push(productToEdit);
              });

              await this._productRepository.save(productsToEdit);

              /**
               * Save variants to received
               */
              const variantsToReceivedToAdd: VariantReception[] = [];

              let position = 0;
              variantsToReceived.map(async (variantToReceived) => {
                const { variant, quantity } = variantToReceived;

                const variantReception = new VariantReception();

                variantReception.productVariant = variant;
                variantReception.variantId = variant.id;
                variantReception.reception = reception;
                variantReception.receptionId = reception.id;
                variantReception.quantity = quantity;
                variantReception.position = position;
                variantReception.state = OperationLineState.PENDING;
                variantReception.createdBy = user;

                variantsToReceivedToAdd.push(variantReception);

                position++;
              });

              await this._variantReceptionRepository.save(
                variantsToReceivedToAdd,
              );

              reception.variantReceptions = variantsToReceivedToAdd;
              reception.productItems = productItemsToEdit;

              await this._receptionRepository.save(reception);
            } else {
              /**Create a new transfert */

              const transfert = new Transfert();

              transfert.reference =
                await this._transfertReferenceService.generateReference();
              transfert.type = TransfertType.ORDER;
              transfert.orderId = order.id;
              transfert.order = order;
              transfert.status = TransfertStatus.PENDING;
              transfert.isRequest = true;
              transfert.source = hostStoragePoint;
              transfert.sourceId = hostStoragePoint.id;
              transfert.target = order.storagePoint;
              transfert.targetId = order.storagePoint.id;

              await this._transfertRepository.save(transfert);

              /**
               * Create variants to transfert array
               */
              const variantsTransfert: VariantItemsModel[] = [];

              if (order.productItems.length > 0) {
                for (const productItem of order.productItems) {
                  // Get product variant
                  const productVariant =
                    await this._productVariantRepository.findOne({
                      where: { id: productItem.productVariantId },
                    });

                  /**
                   * Set product-item variants to received array
                   */
                  let variantToReceivedLine = variantsTransfert.find(
                    (line) => line.variant.id === productVariant.id,
                  );

                  if (!variantToReceivedLine) {
                    variantToReceivedLine = {
                      variant: productVariant,
                      quantity: 1,
                    };

                    variantsTransfert.push(variantToReceivedLine);
                  } else {
                    variantsTransfert.map((line) => {
                      if (
                        line.variant.id === variantToReceivedLine.variant.id
                      ) {
                        line.quantity += 1;
                      }

                      return line;
                    });
                  }
                }
              }

              /**
               * Add variantsToTransfert
               */
              const variantsToTransfertToAdd: VariantTransfert[] = [];
              let transfertPosition = 0;

              variantsTransfert.map((variantToTransfert) => {
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

              await this._variantTransfertRepository.save(
                variantsToTransfertToAdd,
              );

              if (
                order.transferts &&
                !order.transferts.find((t) => t.id === transfert.id)
              ) {
                order.transferts.push(transfert);
              } else {
                order.transferts = [transfert];
              }

              if (order.transferts) {
                order.transferts.push(transfert);
              } else {
                order.transferts = [transfert];
              }
            }

            order.productItems = [];
          }
        }
      }

      console.log('Prices ======================== ', prices);

      if (articlesOrderedToKeep.length > 0) {
        order.subTotal = prices.reduce((sum, current) => sum + current, 0);
      }
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

      if (isAdvance) {
        advance.balance = order.total;
        order.advance = advance;
      } else if (
        orderTotal < order.total &&
        order.paymentStatus === PaymentStatus.PAID
      ) {
        // Change order paymentMode as advance
        order.paymentMode = PaymentMode.ADVANCE_PAYMENT;
        const advanceElt: AdvanceModel = {
          firstPayment: orderTotal,
          balance: order.total - orderTotal,
          lastPayment: order.beforeDeliveryPayment
            ? order.beforeDeliveryPayment.savedAt
            : new Date(),
          history: [],
        };

        order.advance = advanceElt;
      } else if (orderTotal > order.total) {
        //TODO: Generate a refund
      }

      console.log('TOTAUX ', order.subTotal, order.total);
      order.updatedBy = user;

      await this._orderRepository.save(order);

      if (orderMustChangeStatus) {
        // Recalculate the order status
        const actualState = order.orderStep;
        const actualStatus = order.orderStatus;
        const targetStoragePoint = storagePoint
          ? storagePoint
          : hostStoragePoint;

        const missingVariants = variantsAvailabilities.availabilities.filter(
          (availability) => availability.missingQty > 0,
        );

        if (variantsAvailabilities.status !== AvailabilityStatus.ALL) {
          const transfertAndPurchaseProcessOutput =
            await this._orderService.transfertAndPurchaseProcess(
              missingVariants,
              targetStoragePoint,
              order.deliveryMode,
            );

          const { askVariantsToTransfert, variantsToPurchased } =
            transfertAndPurchaseProcessOutput;

          /**
           * If askVariantsToTransfert.lenght > 0
           * ***** Create transferts
           */
          if (askVariantsToTransfert.length > 0) {
            for (const askVariantToTransfert of askVariantsToTransfert) {
              const { sourceStoragePoint, variantsToTransfert } =
                askVariantToTransfert;

              const variantsToAddOnTransfert = variantsToTransfert.filter(
                (variantToTransfert) =>
                  !articlesOrderedToEdit.find(
                    (articleOrdered) =>
                      articleOrdered.article.id ===
                      variantToTransfert.variant.id,
                  ),
              );

              if (variantsToAddOnTransfert.length > 0) {
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
                transfert.target = targetStoragePoint;
                transfert.targetId = targetStoragePoint.id;

                await this._transfertRepository.save(transfert);

                /**
                 * Add variantsToAddOnTransfert
                 */
                const variantsToTransfertToAdd: VariantTransfert[] = [];
                let transfertPosition = 0;

                variantsToAddOnTransfert.map((variantToTransfert) => {
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

                await this._variantTransfertRepository.save(
                  variantsToTransfertToAdd,
                );

                if (order.transferts) {
                  order.transferts.push(transfert);
                } else {
                  order.transferts = [transfert];
                }
              }
            }
          }

          /**
           * If variantsToPurchased.lenght > 0
           * ***** Create purchaseOrder
           */
          if (variantsToPurchased.length > 0) {
            let purchaseOrder = await this._purchaseOrderRepository.findOne({
              where: { orderRef: order.reference },
              relations: ['variantPurchaseds'],
            });

            if (!purchaseOrder) {
              purchaseOrder = new PurchaseOrder();

              purchaseOrder.reference =
                await this._purchaseOrderReferenceService.generate();
              purchaseOrder.storagePointId = targetStoragePoint.id;
              purchaseOrder.storagePoint = targetStoragePoint;
              purchaseOrder.order = order;
              purchaseOrder.orderRef = order.reference;

              await this._purchaseOrderRepository.save(purchaseOrder);
            } else {
              const variantsPurchasedToDelete = purchaseOrder.variantPurchaseds;
              const idsToDelete: string[] = [];

              if (variantsPurchasedToDelete.length > 0) {
                variantsPurchasedToDelete.forEach((variantPurchased) =>
                  idsToDelete.push(variantPurchased.id),
                );

                await this._variantPurchasedRepository.delete(idsToDelete);
              }
            }

            if (purchaseOrder.storagePointId !== targetStoragePoint.id) {
              purchaseOrder.storagePoint = targetStoragePoint;
              purchaseOrder.storagePointId = targetStoragePoint.id;

              await this._purchaseOrderRepository.save(purchaseOrder);
            }

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

            await this._variantPurchasedRepository.save(
              variantsToPurchasedToAdd,
            );

            // purchaseOrder.variantPurchaseds = variantsToPurchasedToAdd;
            // await this._purchaseOrderRepository.save(purchaseOrder);

            // order.purchaseOrder = purchaseOrder;
          }

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

        await this._orderRepository.save(order);

        if (
          actualStatus !== order.orderStatus ||
          actualState !== order.orderStep
        ) {
          const lastOrderProcessing =
            await this._orderProcessingRepository.findOne({
              where: {
                state: actualState,
                status: actualStatus,
                orderId: order.id,
              },
            });

          if (lastOrderProcessing) {
            lastOrderProcessing.endDate = new Date();
            await this._orderProcessingRepository.save(lastOrderProcessing);
          }

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

      const orderModel = await this._orderService.buildOrderModel(order);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${EditOrderService.name} - ${this._tryExecution.name}` + error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const order = await this._orderRepository.findOne({
        where: { id: input.orderId },
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

      if (!order) {
        throw new NotFoundException(
          `The order you are trying to edit was not found`,
        );
      }

      if (order.version !== OrderVersion.CURRENT) {
        throw new BadRequestException(
          `Can only edit ${OrderVersion.CURRENT} version.`,
        );
      }

      /**
       * User roles validation
       */
      if (
        order.type === OrderType.DEAD_STOCK_ORDER ||
        order.type === OrderType.DESTOCKAGE_ORDER
      ) {
        if (
          !user.roles.some(
            (role) =>
              role === AgentRoles.SUPER_ADMIN ||
              role === AgentRoles.ADMIN ||
              role === AgentRoles.STOCK_AGENT ||
              role === AgentRoles.PICK_PACK ||
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.LOGISTIC_MANAGER ||
              role === AgentRoles.PROCUREMENT_ASSISTANT,
          )
        ) {
          throw new UnauthorizedException(
            `You are not authorized to update ${order.type}`,
          );
        }
      }

      if (
        input.sellerCode &&
        input.sellerCode !== order.sellerCode &&
        (!user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.WAREHOUSE_MANAGER ||
            role === AgentRoles.FLEET_SUPERVISOR ||
            role === AgentRoles.PROCUREMENT_ASSISTANT,
        ) ||
          user.email !== order.createdBy.email)
      ) {
        throw new UnauthorizedException(`You cannot change the seller code`);
      }

      if (
        order.orderStatus === StepStatus.DELIVERED ||
        order.orderStatus === StepStatus.COMPLETE ||
        order.orderStatus === StepStatus.CANCELED ||
        order.orderStatus === StepStatus.REFUNDED
      ) {
        throw new BadRequestException(
          `You cannot update a ${order.orderStatus} order`,
        );
      }

      if (
        input.paymentMethod &&
        (input.paymentMethod === PaymentMethod.ORANGE_MONEY ||
          input.paymentMethod === PaymentMethod.MOBILE_MONEY ||
          input.paymentMethod === PaymentMethod.GLOTELHO_PAY) &&
        !input.paymentRef &&
        !order.paymentRef
      ) {
        throw new BadRequestException(
          `Please provide the payment reference since the payment method is ${input.paymentMethod}`,
        );
      }

      /**
       * Cannot update articles ordered if the order
       * has a purchase order which is not yet PENDING or CANCELLED
       */
      // if (
      //   input.articlesOrdered &&
      //   input.articlesOrdered.length > 0 &&
      //   order.purchaseOrder &&
      //   order.purchaseOrder.status !== OperationStatus.PENDING &&
      //   order.purchaseOrder.status !== OperationStatus.CANCELED
      // ) {
      //   throw new BadRequestException(
      //     `You cannot update '${order.reference}' articles ordered as it is being processed with purchase '${order.purchaseOrder.reference}' already ${order.purchaseOrder.status} `,
      //   );
      // }

      if (order.storagePoint) {
        order.storagePoint.address = await this._addressRepository.findOne({
          where: { id: order.storagePoint.addressId },
        });
      }

      const dataChanged: OrderSensitivesData[] = [];

      let storagePoint: StoragePoint;
      if (
        input.storagePointId &&
        !isNullOrWhiteSpace(input.storagePointId) &&
        order.storagePointId !== input.storagePointId
      ) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: input.storagePointId },
          relations: ['address'],
        });

        if (!storagePoint) {
          throw new NotFoundException(
            `StoragePoint ${input.storagePointId} not found`,
          );
        }

        if (
          !dataChanged.find(
            (data) => data === OrderSensitivesData.STORAGE_POINT,
          ) &&
          !user.roles.some((role) => role === AgentRoles.WAREHOUSE_MANAGER)
        ) {
          dataChanged.push(OrderSensitivesData.STORAGE_POINT);
        }
      }

      if (
        input.fixedDeliveryFees &&
        (Number.isNaN(input.fixedDeliveryFees) || input.fixedDeliveryFees < 0)
      ) {
        throw new BadRequestException(
          `Invalid delivery fees: ${input.advance}`,
        );
      }

      if (input.fixedDeliveryFees) {
        if (
          !dataChanged.find(
            (data) => data === OrderSensitivesData.DELIVERY_FEES,
          ) &&
          !user.roles.some((role) => role === AgentRoles.LOGISTIC_MANAGER)
        ) {
          dataChanged.push(OrderSensitivesData.DELIVERY_FEES);
        }
      }

      let billingAddress: Address;
      if (
        input.billingAddressId &&
        !isNullOrWhiteSpace(input.billingAddressId) &&
        order.billingAddressId !== input.billingAddressId
      ) {
        billingAddress = await this._addressRepository.findOne(
          input.billingAddressId,
        );
        if (!billingAddress) {
          throw new NotFoundException(`Billing address provided not found.`);
        }
      }

      let deliveryAddress: Address;
      if (
        input.deliveryAddressId &&
        !isNullOrWhiteSpace(input.deliveryAddressId) &&
        order.deliveryAddressId !== input.deliveryAddressId
      ) {
        deliveryAddress = await this._addressRepository.findOne(
          input.deliveryAddressId,
        );
        if (!deliveryAddress) {
          throw new NotFoundException(`Delivery address provided not found.`);
        }
      }

      let globalVoucher: Voucher;
      if (
        input.globalVoucherId &&
        !isNullOrWhiteSpace(input.globalVoucherId) &&
        order.voucherId !== input.globalVoucherId
      ) {
        globalVoucher = await this._voucherRepository.findOne(
          input.globalVoucherId,
        );
        if (!globalVoucher) {
          throw new NotFoundException(`Invalid voucher code.`);
        }
        if (
          !dataChanged.find(
            (data) => data === OrderSensitivesData.PRODUCT_PRICE,
          ) &&
          !user.roles.some(
            (role) =>
              role === AgentRoles.PUS_COORDINATOR || role === AgentRoles.DAF,
          )
        ) {
          dataChanged.push(OrderSensitivesData.PRODUCT_PRICE);
        }
      }

      /**
       * Instalment and advance validation
       */
      if (input.instalment && input.advance) {
        throw new BadRequestException(
          `Cannot update order with instalment and advance`,
        );
      }

      if (
        input.instalment &&
        input.instalment.type === InstalmentType.EN_AVAL &&
        !input.guarantor &&
        !order.guarantor
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

      // if (
      //   input.specialPayment &&
      //   (!order.instalments || !input.instalment) &&
      //   (!order.advance || !input.advance)
      // ) {
      //   throw new BadRequestException(
      //     `You can only add special payments to an ${SpecialPaymentType.INSTALMENT} or ${SpecialPaymentType.ADVANCE} order`,
      //   );
      // }

      // if (
      //   input.specialPayment &&
      //   ((input.specialPayment.type === SpecialPaymentType.INSTALMENT &&
      //     (!order.instalments || !input.instalment)) ||
      //     (input.specialPayment.type === SpecialPaymentType.ADVANCE &&
      //       (!order.advance || !input.advance)))
      // ) {
      //   throw new BadRequestException(
      //     `You cannot add an ${input.specialPayment.type} payment for an this order`,
      //   );
      // }

      let instalment: Instalment;
      if (input.instalment) {
        if (order.advance && order.advance.history.length > 0) {
          throw new BadRequestException(
            `Advance payment is already configured for this order`,
          );
        }

        if (
          order.instalment &&
          order.instalment.instalments.find(
            (instalment) => instalment.status === InstalmentStatus.PAID,
          )
        ) {
          throw new BadRequestException(
            `You cannot update the instalment payment with an already paid instalment.`,
          );
        }

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

        const instalmentValues: InstalmentModel[] = [];
        let position = 0;
        let balance: 0;
        instalments.forEach((instalment) => {
          const { value, deadline } = instalment;
          const instalmentValue: InstalmentModel = {
            position,
            status: InstalmentStatus.UNPAID,
            value,
            deadline,
          };
          instalmentValues.push(instalmentValue);
          balance += value;
          position++;
        });

        instalment = {
          taux,
          type,
          balance,
          instalments: instalmentValues,
        };
      }

      let advance: AdvanceModel;
      if (input.advance) {
        if (order.advance && order.advance.history.length > 0) {
          throw new BadRequestException(
            `Advance payment is already configured for this order`,
          );
        }

        if (
          order.instalment &&
          order.instalment.instalments.find(
            (instalment) => instalment.status === InstalmentStatus.PAID,
          )
        ) {
          throw new BadRequestException(
            `Instalment payment is already configured for this order.`,
          );
        }

        if (Number.isNaN(input.advance) || input.advance <= 0) {
          throw new BadRequestException(
            `Invalid advance amount: ${input.advance}`,
          );
        }

        advance = {
          firstPayment: input.advance,
          balance: 0,
          history: [],
        };
      }

      // if (input.specialPayment) {
      //   const { type, amount } = input.specialPayment;
      //   if (Number.isNaN(amount) || amount <= 0) {
      //     throw new BadRequestException(
      //       `Invalid special payment amount: ${amount}`,
      //     );
      //   }

      //   if (type === SpecialPaymentType.INSTALMENT) {
      //   }

      //   if (type === SpecialPaymentType.ADVANCE) {
      //   }
      // }

      let comments: CommentModel[] = [];
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comments = this._orderService.buildOrderComments(
          order,
          input.comment,
          user,
        );
      }

      const articlesOrderedToAdd: ProductVariantOrderedModel[] = [];
      let articlesOrderedToRemove: ArticleOrdered[] = [];
      const articlesOrderedToEdit: ProductVariantOrderedModel[] = [];
      let variantsAvailabilities: VariantsAvailabilities;

      if (input.articlesOrdered && input.articlesOrdered.length > 0) {
        variantsAvailabilities = storagePoint
          ? await this._orderService.checkVariantsAvailabilitiesForOrderEdit(
              order.type,
              storagePoint,
              input.articlesOrdered,
            )
          : await this._orderService.checkVariantsAvailabilitiesForOrderEdit(
              order.type,
              order.storagePoint,
              input.articlesOrdered,
            );

        /**
         * If outputType = DEAD_STOCK_OUTPUT or DESTOCKAGE_OUTPUT
         * If all variants available
         * If not reject order
         */
        if (
          (order.type === OrderType.DEAD_STOCK_ORDER ||
            order.type === OrderType.DESTOCKAGE_ORDER) &&
          variantsAvailabilities.status !== AvailabilityStatus.ALL
        ) {
          throw new BadRequestException(
            `Some products you choose are not available in the DEAD area of '${storagePoint.name}' warehouse`,
          );
        }

        for (const articleOrdered of input.articlesOrdered) {
          const { articleId, quantity, customPrice, discount } = articleOrdered;

          const currentArticleOrdered =
            await this._articleOrderedRepository.findOne({
              where: { orderId: order.id, productVariantId: articleId },
            });

          const article = await this._productVariantRepository.findOne(
            { id: articleId },
            { relations: ['product', 'attributeValues', 'productItems'] },
          );
          if (!article) {
            throw new NotFoundException(`Article '${articleId}' not found.`);
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
              `Cannot set price and add a discount at the same time`,
            );
          }

          if (currentArticleOrdered) {
            if (customPrice && customPrice !== currentArticleOrdered.price) {
              if (
                !dataChanged.find(
                  (data) => data === OrderSensitivesData.PRODUCT_PRICE,
                )
              ) {
                dataChanged.push(OrderSensitivesData.PRODUCT_PRICE);
              }
            }

            if (discount && discount !== currentArticleOrdered.discount) {
              if (
                !dataChanged.find(
                  (data) => data === OrderSensitivesData.PRODUCT_PRICE,
                )
              ) {
                dataChanged.push(OrderSensitivesData.PRODUCT_PRICE);
              }
            }
          }

          const articleOrderedLine: ProductVariantOrderedModel = {
            article,
            quantity,
            customPrice,
            discount,
          };

          if (
            order.articleOrdereds.find(
              (articleLine) => articleLine.productVariantId === article.id,
            )
          ) {
            articlesOrderedToEdit.push(articleOrderedLine);
          } else {
            articlesOrderedToAdd.push(articleOrderedLine);
          }
        }

        articlesOrderedToRemove = order.articleOrdereds.filter(
          (articleLine) =>
            !input.articlesOrdered.find(
              (inputArticle) =>
                inputArticle.articleId === articleLine.productVariantId,
            ),
        );
      }

      return {
        order,
        billingAddress,
        deliveryAddress,
        globalVoucher,
        comments,
        instalment,
        advance,
        storagePoint,
        hostStoragePoint: order.storagePoint,
        articlesOrderedToAdd,
        articlesOrderedToRemove,
        articlesOrderedToEdit,
        dataChanged,
        variantsAvailabilities,
        orderTotal: order.total,
        isBillingAddressChange: !!billingAddress,
        isDeliveryAddressChange: !!deliveryAddress,
        isGlobalVoucher: !!globalVoucher,
        isNewComment: !!input.comment && !isNullOrWhiteSpace(input.comment),
        isInstalment: !!instalment,
        isAdvance: !!advance,
        isNewGuarantor: !!input.guarantor,
        isStoragePointChange: !!storagePoint,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
