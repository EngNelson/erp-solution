import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
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
import { OrderItemOutput } from 'src/domain/dto/orders';
import {
  Reception,
  Transfert,
  VariantReception,
  VariantTransfert,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import {
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StatusLine,
  StepStatus,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import {
  AvailabilityStatus,
  OrderChangesAppliedStatus,
  OrderSensitivesData,
  OrderStep,
} from 'src/domain/enums/orders';
import { UpdatedType } from 'src/domain/enums/warehouses';
import { VariantItemsModel } from 'src/domain/interfaces/i.variant-items.model';
import {
  SetProductQuantityModel,
  SetVariantQuantityModel,
} from 'src/domain/interfaces/items';
import { ArticlesOrderedType } from 'src/domain/types/orders';
import {
  ReceptionRepository,
  TransfertRepository,
  VariantReceptionRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import {
  OrderService,
  ProductsService,
  ProductVariantService,
} from 'src/services/generals';
import {
  ReceptionService,
  TransfertService,
} from 'src/services/references/flows';
import { SharedService } from 'src/services/utilities';
import { ApplyOrderChangesInput } from './dto';
import { VariantsAvailabilities } from 'src/domain/interfaces/orders';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { DOUALA_CITY, YAOUNDE_CITY } from 'src/domain/constants';

type ValidationResult = {
  order: Order;
  variantsAvailabilities: VariantsAvailabilities;
  dataToApply: OrderSensitivesData;
  previousVersion: Order;
  previousStoragePoint: StoragePoint;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ApplyOrderChangesService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _orderService: OrderService,
    private readonly _sharedService: SharedService,
    private readonly _productVariantService: ProductVariantService,
    private readonly _productService: ProductsService,
    private readonly _transfertReferenceService: TransfertService,
  ) {}

  async applyOrderChanges(
    input: ApplyOrderChangesInput,
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
        variantsAvailabilities,
        dataToApply,
        previousVersion,
        previousStoragePoint,
        lang,
        user,
      } = result;

      order.changesToApply.map((change) => {
        if (change.dataChanged === dataToApply) {
          change.status = OrderChangesAppliedStatus.APPLIED;
          change.appliedAt = new Date();
          change.appliedBy = user;
        }

        return change;
      });

      if (dataToApply === OrderSensitivesData.STORAGE_POINT) {
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
            reception.storagePoint = previousStoragePoint;
            reception.storagePointId = previousStoragePoint.id;

            await this._receptionRepository.save(reception);

            const variantsToReceived: VariantItemsModel[] = [];
            const productItemsToEdit: ProductItem[] = [];
            const variantsToEditQuantities: SetVariantQuantityModel[] = [];
            const productsToEditQuantities: SetProductQuantityModel[] = [];

            if (previousVersion.productItems.length > 0) {
              await Promise.all(
                previousVersion.productItems.map(async (productItem) => {
                  // Get product variant and product
                  const productVariant = productItem.productVariant;

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
                    this._sharedService.getQuantityProperty(productItem.state);

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
            transfert.source = previousStoragePoint;
            transfert.sourceId = previousStoragePoint.id;
            transfert.target = order.storagePoint;
            transfert.targetId = order.storagePoint.id;

            await this._transfertRepository.save(transfert);

            /**
             * Create variants to transfert array
             */
            const variantsTransfert: VariantItemsModel[] = [];

            if (previousVersion.productItems.length > 0) {
              await Promise.all(
                previousVersion.productItems.map(async (productItem) => {
                  // Get product variant
                  const productVariant = productItem.productVariant;

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
                }),
              );
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

            if (order.transferts) {
              order.transferts.push(transfert);
            } else {
              order.transferts = [transfert];
            }

            if (previousVersion.transferts) {
              previousVersion.transferts.push(transfert);
            } else {
              previousVersion.transferts = [transfert];
            }
          }
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
        `${ApplyOrderChangesService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ApplyOrderChangesInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const dataToApply = input.dataToApply;

      /**
       * Get order to apply changes
       */
      const order = await this._orderRepository.findOne({
        where: { id: input.orderId },
        relations: [
          'billingAddress',
          'deliveryAddress',
          'storagePoint',
          'productItems',
          'transferts',
          'articleOrdereds',
          'orderProcessings',
          'purchaseOrder',
        ],
      });

      if (!order) {
        throw new NotFoundException(
          `Order of id ${input.orderId} is not found`,
        );
      }

      /**
       * Verify user abilities
       */
      if (
        (dataToApply === OrderSensitivesData.DELIVERY_FEES &&
          !user.roles.some(
            (role) =>
              role === AgentRoles.LOGISTIC_MANAGER ||
              role === AgentRoles.SUPER_ADMIN,
          )) ||
        (dataToApply === OrderSensitivesData.PRODUCT_PRICE &&
          !user.roles.some(
            (role) =>
              role === AgentRoles.DAF ||
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.PUS_COORDINATOR ||
              role === AgentRoles.SUPER_ADMIN,
          )) ||
        (dataToApply === OrderSensitivesData.STORAGE_POINT &&
          !user.roles.some(
            (role) =>
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.SUPER_ADMIN,
          ))
      ) {
        throw new UnauthorizedException(
          `You don't have permission to apply changes on ${dataToApply}`,
        );
      }

      /**
       * Check if order has changes to be applied
       */
      console.log('changes to apply', order.changesToApply);

      if (
        !order.changesToApply ||
        order.changesToApply.length === 0 ||
        (order.changesToApply.length > 0 &&
          !order.changesToApply.find(
            (change) => change.status === OrderChangesAppliedStatus.PENDING,
          ))
      ) {
        throw new NotFoundException(
          `Order of id ${order.reference} has not changes to apply`,
        );
      }

      let variantsAvailabilities: VariantsAvailabilities;
      let previousVersion: Order;
      let previousStoragePoint: StoragePoint;

      if (dataToApply === OrderSensitivesData.STORAGE_POINT) {
        // Build ArticlesOrderedType
        const articleOrderedTypes: ArticlesOrderedType[] = [];
        await Promise.all(
          order.articleOrdereds.map(async (articleOrdered) => {
            const article = await this._productVariantRepository.findOneOrFail({
              where: { id: articleOrdered.productVariantId },
            });

            const articleOrderedType: ArticlesOrderedType = {
              articleRef: article.reference,
              quantity: articleOrdered.quantity,
              customPrice: articleOrdered.discount
                ? articleOrdered.price
                : null,
              discount: articleOrdered.discount,
            };

            articleOrderedTypes.push(articleOrderedType);
          }),
        );

        variantsAvailabilities =
          await this._orderService.checkVariantsAvailabilities(
            order.type,
            order.storagePoint,
            articleOrderedTypes,
          );

        const previousId = order.changesToApply.find(
          (change) =>
            change.status === OrderChangesAppliedStatus.PENDING &&
            change.dataChanged === dataToApply,
        ).previousVersionId;

        if (!previousId) {
          throw new InternalServerErrorException(
            `Some wrong happened. Please try again later`,
          );
        }

        previousVersion = await this._orderRepository.findOneOrFail({
          where: { id: previousId },
          relations: ['storagePoint', 'productItems'],
        });

        previousStoragePoint = previousVersion.storagePoint;
      }

      return {
        order,
        variantsAvailabilities,
        dataToApply,
        previousVersion,
        previousStoragePoint,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ApplyOrderChangesService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
