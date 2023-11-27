import {
  AgentRoles,
  ISOLang,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
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
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import {
  OperationLineState,
  OperationStatus,
  StepStatus,
  TransfertStatus,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { OrderStep } from 'src/domain/enums/orders';
import { VariantItemsModel } from 'src/domain/interfaces/i.variant-items.model';
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
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { OrderService } from 'src/services/generals';
import { ReceptionService } from 'src/services/references/flows';
import { CancelOrderInput } from './dto/cancel-order-input.dto';
import { SharedService } from 'src/services/utilities';
import { CancelReasonItem } from 'src/domain/interfaces/orders';
import { CommentModel } from 'src/domain/interfaces';
import { CANCEL_REASON_DATA } from 'src/domain/constants/public.constants';

type ValidationResult = {
  order: Order;
  cancelReason: CancelReasonItem;
  comments: CommentModel[];
  isNewComment: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
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
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _orderService: OrderService,
    private readonly _sharedService: SharedService,
  ) {}

  async cancelOrder(
    input: CancelOrderInput,
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
      const { order, cancelReason, comments, isNewComment, lang, user } =
        result;

      /** First case*/
      if (
        order.orderStatus === StepStatus.READY ||
        order.orderStatus === StepStatus.PICKED_UP ||
        order.orderStatus === StepStatus.TO_DELIVER ||
        order.orderStatus === StepStatus.ASSIGNED
      ) {
        /**
         * Create a new reception
         */
        const reception = new Reception();

        reception.reference =
          await this._receptionReferenceService.generateReference();
        reception.type =
          this._orderService.getReceptionTypeByOrderCancelReason(cancelReason);
        reception.status = OperationStatus.PENDING;

        reception.storagePoint = order.storagePoint;
        reception.storagePointId = order.storagePointId;
        reception.createdBy = user;

        await this._receptionRepository.save(reception);

        const variantsToReceived: VariantItemsModel[] = [];
        const productItemsToEdit: ProductItem[] = [];
        const variantsToUpdate: ProductVariant[] = [];

        if (order.productItems.length > 0) {
          for (const productItem of order.productItems) {
            // Get product variant and product
            const productVariant = productItem.productVariant;

            const productToUpdate = await this._productRepository.findOne({
              where: { id: productVariant.productId },
            });

            if (!productToUpdate) {
              continue;
            }

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
                if (line.variant.id === variantToReceivedLine.variant.id) {
                  line.quantity += 1;
                }

                return line;
              });
            }

            /**
             * Set product and variant quantities
             */
            // Get current line state
            const qtyPropertyToRemove = this._sharedService.getQuantityProperty(
              productItem.state,
            );

            productVariant.quantity.pendingReception += 1;
            productVariant.quantity[qtyPropertyToRemove] -= 1;
            await this._productVariantRepository.save(productVariant);

            productToUpdate.quantity.pendingReception += 1;
            productToUpdate.quantity[qtyPropertyToRemove] -= 1;
            await this._productRepository.save(productToUpdate);

            if (
              !variantsToUpdate.find(
                (variant) => variant.id === productVariant.id,
              )
            ) {
              variantsToUpdate.push(productVariant);
            }

            productItem.state = ItemState.PENDING_RECEPTION;
            productItem.status = StepStatus.TO_RECEIVED;
            productItem.receptionId = reception.id;
            productItem.reception = reception;

            productItemsToEdit.push(productItem);
          }
        }

        await this._productItemRepository.save(productItemsToEdit);

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

        await this._variantReceptionRepository.save(variantsToReceivedToAdd);

        reception.variantReceptions = variantsToReceivedToAdd;
        reception.productItems = order.productItems;

        await this._receptionRepository.save(reception);

        /** Second case*/
      } else if (order.orderStatus === StepStatus.TO_BUY) {
        if (
          order.purchaseOrder &&
          !isNullOrWhiteSpace(order.purchaseOrder.id)
        ) {
          await this._purchaseOrderTreatment(order, cancelReason, user);
        }

        /** Third case*/
      } else if (
        (order.orderStatus === StepStatus.TO_RECEIVED &&
          order.orderStep === OrderStep.AWAITING_RECEPTION) ||
        order.orderStatus === StepStatus.TO_TREAT
      ) {
        const allOrderTransferts = order.transferts;

        if (allOrderTransferts.length > 0) {
          await this._transfertsTreatment(
            allOrderTransferts,
            cancelReason,
            user,
          );
        }

        if (
          order.purchaseOrder &&
          !isNullOrWhiteSpace(order.purchaseOrder.id)
        ) {
          await this._purchaseOrderTreatment(order, cancelReason, user);
        }
      } else if (
        /** Last case*/
        order.orderStatus === StepStatus.TO_RECEIVED &&
        order.orderStep === OrderStep.IN_TRANSIT
      ) {
        const allOrderTransferts = order.transferts;

        if (allOrderTransferts.length > 0) {
          await this._transfertsTreatment(
            allOrderTransferts,
            cancelReason,
            user,
          );
        }
      }

      /**Order cancel traitment begining */
      if (isNewComment) order.comments = comments;
      order.canceledAt = new Date();
      order.canceledBy = user;
      order.orderStatus = StepStatus.CANCELED;
      order.cancelReason = cancelReason;

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
        `${CancelOrderService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: CancelOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get order to cancel
       */
      const order = await this._orderRepository.findOne({
        where: { barcode: input.orderBarcode },
        relations: [
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
          `Order of barcode ${input.orderBarcode} is not found`,
        );
      }

      // if (
      //   !user.workStation?.warehouse &&
      //   !user.roles.some(
      //     (role) =>
      //       role === AgentRoles.SUPER_ADMIN || role === AgentRoles.ADMIN,
      //   )
      // ) {
      //   throw new UnauthorizedException(
      //     `You are not authorized to cancel an order. Please contact your manager or administrator`,
      //   );
      // }

      if (
        order.orderStatus === StepStatus.DELIVERED ||
        order.orderStatus === StepStatus.COMPLETE ||
        order.orderStatus === StepStatus.CANCELED ||
        order.orderStatus === StepStatus.REFUNDED
      ) {
        throw new BadRequestException(
          `The order ${order.reference} status is ${order.orderStatus}. You cannot cancel it.`,
        );
      }

      const cancelReasonFound = CANCEL_REASON_DATA.find((parent) =>
        parent.children.find((child) => child.code === input.cancelReasonCode),
      );

      if (!cancelReasonFound) {
        throw new NotFoundException(
          `Cannot find ${input.cancelReasonCode} among cancel reasons`,
        );
      }

      if (
        !cancelReasonFound.requiredStatus.find(
          (status) => status === order.orderStatus,
        )
      ) {
        throw new BadRequestException(
          `Cannot not camcel ${order.orderStatus} with a ${cancelReasonFound.label} reason`,
        );
      }

      let comments: CommentModel[] = [];
      if (input.newComment && !isNullOrWhiteSpace(input.newComment)) {
        comments = this._orderService.buildOrderComments(
          order,
          input.newComment,
          user,
        );
      }

      const cancelReason = this._orderService.buildOrderCancelReasonItem(
        input.cancelReasonCode,
      );

      if (order.productItems && order.productItems.length > 0) {
        order.productItems.map(async (productItem) => {
          productItem.productVariant =
            await this._productVariantRepository.findOne({
              where: { id: productItem.productVariantId },
            });

          return productItem;
        });
      }

      return {
        order,
        cancelReason,
        comments,
        isNewComment: input.newComment && !isNullOrWhiteSpace(input.newComment),
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }

  private async _cancelPendingOrSavedPurchase(
    purchaseOrder: PurchaseOrder,
    user: UserCon,
  ): Promise<void> {
    try {
      /**
       * Cancel purchase order
       */
      purchaseOrder.status = OperationStatus.CANCELED;
      purchaseOrder.canceledBy = user;
      purchaseOrder.canceledAt = new Date();

      /**
       * Cancel each variant purchase order line
       */
      const variantsToPurchaseToCancel: VariantPurchased[] = [];
      purchaseOrder.variantPurchaseds.map((variantPurchased) => {
        variantPurchased.state = OperationLineState.CANCELED;

        variantsToPurchaseToCancel.push(variantPurchased);
      });

      await this._variantPurchasedRepository.save(variantsToPurchaseToCancel);

      await this._purchaseOrderRepository.save(purchaseOrder);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelOrderService.name} - ${this._cancelPendingOrSavedPurchase.name} - ` +
          error.message,
      );
    }
  }

  private async _treatPurchaseOrderReception(
    purchaseOrder: PurchaseOrder,
    cancelReason: CancelReasonItem,
  ): Promise<void> {
    try {
      const reception = await this._receptionRepository.findOneOrFail({
        where: { purchaseOrderId: purchaseOrder.id },
        relations: ['storagePoint', 'variantReceptions', 'productItems'],
      });

      if (reception.status === OperationStatus.PENDING) {
        reception.type =
          this._orderService.getReceptionTypeByOrderCancelReason(cancelReason);
      } else if (reception.status === OperationStatus.VALIDATED) {
        const productItemsToEdit: ProductItem[] = [];

        if (reception.productItems.length > 0) {
          await Promise.all(
            reception.productItems.map(async (productItem) => {
              /**
               * Change product-item state and status if neccesary
               */
              if (productItem.state === ItemState.RESERVED) {
                productItem.status = StepStatus.TO_STORE;
                productItem.state = ItemState.AVAILABLE;

                productItemsToEdit.push(productItem);
              }
            }),
          );

          if (productItemsToEdit.length > 0)
            await this._productItemRepository.save(productItemsToEdit);
        }
      }

      await this._receptionRepository.save(reception);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelOrderService.name} - ${this._treatPurchaseOrderReception.name} - ` +
          error.message,
      );
    }
  }

  private async _cancelPendingTranfert(
    transfert: Transfert,
    user: UserCon,
  ): Promise<void> {
    try {
      /**
       * Cancel transfert
       */
      transfert.status = TransfertStatus.CANCELED;
      transfert.canceledBy = user;
      transfert.canceledAt = new Date();

      const variantToTransfertToCancel: VariantTransfert[] = [];
      transfert.variantTransferts.forEach(async (variantTransfert) => {
        variantTransfert.state = OperationLineState.CANCELED;

        variantToTransfertToCancel.push(variantTransfert);
      });

      await this._variantTransfertRepository.save(variantToTransfertToCancel);

      await this._transfertRepository.save(transfert);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelOrderService.name} - ${this._cancelPendingTranfert.name} - ` +
          error.message,
      );
    }
  }

  private async _cancelConfirmedTranfert(
    transfert: Transfert,
    cancelReason: CancelReasonItem,
    user: UserCon,
  ): Promise<void> {
    try {
      /**
       * Create new reception on target storage-point
       */
      const reception = new Reception();

      reception.reference =
        await this._receptionReferenceService.generateReference(
          reception,
          false,
        );
      reception.type =
        this._orderService.getReceptionTypeByOrderCancelReason(cancelReason);
      reception.status = OperationStatus.PENDING;
      reception.mobileUnits = transfert.mobileUnits;

      reception.storagePoint = transfert.target;
      reception.storagePointId = transfert.targetId;
      reception.createdBy = user;

      await this._receptionRepository.save(reception);

      /**
       * Set all items state to PENDING_RECEPTION
       * Set product and variant quantities for each item
       */
      const variantsToReceived: VariantItemsModel[] = [];
      const productItemsToUpdate: ProductItem[] = [];

      // Get items locations
      for (const mobileUnit of transfert.mobileUnits) {
        for (const item of mobileUnit.productItems) {
          /**
           * Set product and variant quantities
           */
          const variantToUpdate =
            await this._productVariantRepository.findOneOrFail({
              where: { id: item.productVariantId },
              relations: ['product'],
            });
          const productToUpdate = variantToUpdate.product;

          /**
           * Set product-item variants to received array
           */
          let variantToReceivedLine = variantsToReceived.find(
            (line) => line.variant.id === productToUpdate.id,
          );

          if (!variantToReceivedLine) {
            variantToReceivedLine = {
              variant: variantToUpdate,
              quantity: 1,
            };

            variantsToReceived.push(variantToReceivedLine);
          } else {
            variantsToReceived.map((line) => {
              if (line.variant.id === variantToReceivedLine.variant.id) {
                line.quantity += 1;
              }

              return line;
            });
          }

          // Get current line state
          const qtyPropertyToRemove = this._sharedService.getQuantityProperty(
            item.state,
          );

          variantToUpdate.quantity.pendingReception += 1;
          variantToUpdate.quantity[qtyPropertyToRemove] -= 1;
          await this._productVariantRepository.save(variantToUpdate);

          productToUpdate.quantity.pendingReception += 1;
          productToUpdate.quantity[qtyPropertyToRemove] -= 1;
          await this._productRepository.save(productToUpdate);

          item.state = ItemState.PENDING_RECEPTION;
          item.status = StepStatus.TO_RECEIVED;

          productItemsToUpdate.push(item);
        }
      }

      await this._productItemRepository.save(productItemsToUpdate);

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

      await this._variantReceptionRepository.save(variantsToReceivedToAdd);

      reception.variantReceptions = variantsToReceivedToAdd;
      reception.productItems = productItemsToUpdate;

      await this._receptionRepository.save(reception);

      /**
       * Cancel transfert
       */
      transfert.status = TransfertStatus.CANCELED;
      transfert.canceledBy = user;
      transfert.canceledAt = new Date();

      const variantToTransfertToCancel: VariantTransfert[] = [];
      transfert.variantTransferts.forEach(async (variantTransfert) => {
        variantTransfert.state = OperationLineState.CANCELED;

        variantToTransfertToCancel.push(variantTransfert);
      });

      await this._variantTransfertRepository.save(variantToTransfertToCancel);

      await this._transfertRepository.save(transfert);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelOrderService.name} - ${this._cancelConfirmedTranfert.name} - ` +
          error.message,
      );
    }
  }

  private async _transfertsTreatment(
    transferts: Transfert[],
    cancelReason: CancelReasonItem,
    user: UserCon,
  ) {
    await Promise.all(
      transferts.map(async (singleTransfert) => {
        /**
         * Get transfert to cancel
         */
        const transfert = await this._transfertRepository.findOneOrFail(
          singleTransfert.id,
          {
            relations: [
              'target',
              'source',
              'order',
              'variantTransferts',
              'mobileUnits',
            ],
          },
        );

        if (transfert.status === TransfertStatus.PENDING) {
          // Cancel pending transfert
          await this._cancelPendingTranfert(transfert, user);
        } else if (transfert.status === TransfertStatus.CONFIRMED) {
          // Cancel confirmed transfert
          await this._cancelConfirmedTranfert(transfert, cancelReason, user);
        } else if (transfert.status === TransfertStatus.VALIDATED) {
          // Detaches the order from the transfer
          transfert.order = null;
          transfert.orderId = null;

          await this._transfertRepository.save(transfert);
        }
      }),
    );
  }

  private async _purchaseOrderTreatment(
    order: Order,
    cancelReason: CancelReasonItem,
    user: UserCon,
  ) {
    console.log('Cancelling purchase order ', order.purchaseOrder.reference);

    /**
     * Get purchase order to cancel
     */
    const purchaseOrder = await this._purchaseOrderRepository.findOneOrFail(
      order.purchaseOrder.id,
      { relations: ['variantPurchaseds'] },
    );

    if (purchaseOrder.status === OperationStatus.VALIDATED) {
      //Treat purchase-order reception
      this._treatPurchaseOrderReception(purchaseOrder, cancelReason);
    } else if (
      purchaseOrder.status === OperationStatus.PENDING ||
      purchaseOrder.status === OperationStatus.SAVED
    ) {
      //Cancel pending or saved purchase
      await this._cancelPendingOrSavedPurchase(purchaseOrder, user);
    }
  }
}
