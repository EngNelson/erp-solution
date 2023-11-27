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
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { PurchaseOrderItemOutput } from 'src/domain/dto/purchases';
import {
  OrderProcessing,
  Reception,
  Transfert,
  VariantReception,
} from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import {
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StepStatus,
  TransfertStatus,
} from 'src/domain/enums/flows';
import { ProductType } from 'src/domain/enums/items';
import { OrderStep } from 'src/domain/enums/orders';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';
import { EditedVariantsToPurchaseModel } from 'src/domain/interfaces/purchases';
import {
  PurchaseOrderModel,
  VariantsToPurchaseModel,
} from 'src/domain/types/purchases';
import {
  OrderProcessingRepository,
  ReceptionRepository,
  TransfertRepository,
  VariantReceptionRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { ReceptionService } from 'src/services/references/flows';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SharedService } from 'src/services/utilities';

import { ValidatePurchaseOrderInput } from './dto';
import { OrderReferenceService } from 'src/services/references/orders';

type ValidationResult = {
  purchaseOrder: PurchaseOrder;
  validatedVariantsToPurchase: EditedVariantsToPurchaseModel[];
  reportedVariantsToPurchase: EditedVariantsToPurchaseModel[];
  canceledVariantsToPurchase: EditedVariantsToPurchaseModel[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidatePurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _recepetionReferenceService: ReceptionService,
    private readonly _sharedService: SharedService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async validatePurchaseOrder(
    input: ValidatePurchaseOrderInput,
    user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
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
  ): Promise<PurchaseOrderItemOutput> {
    try {
      const {
        purchaseOrder,
        validatedVariantsToPurchase,
        reportedVariantsToPurchase,
        canceledVariantsToPurchase,
        lang,
        user,
      } = result;

      /**
       * validated quantities treatement
       * set purchase order status to VALIDATED
       * update each line quantities and state to VALIDATED
       */
      let validatedPosition = 0;
      if (
        validatedVariantsToPurchase &&
        validatedVariantsToPurchase.length > 0
      ) {
        const variantsToPurchaseToUpdate: VariantPurchased[] = [];

        const variantsToUpdate: ProductVariant[] = [];

        await Promise.all(
          validatedVariantsToPurchase.map(async (validatedLine) => {
            const { productVariant, purchaseCost, ...data } = validatedLine;

            const variantToPurchase =
              await this._variantPurchasedRepository.findOne({
                where: { id: validatedLine.id },
              });

            variantToPurchase.quantity = validatedLine.newQuantity;
            variantToPurchase.state = validatedLine.newState;

            variantsToPurchaseToUpdate.push(variantToPurchase);
            validatedPosition++;

            productVariant.purchaseCost = purchaseCost;

            variantsToUpdate.push(productVariant);
          }),
        );

        await this._variantPurchasedRepository.save(variantsToPurchaseToUpdate);

        await this._productVariantRepository.save(variantsToUpdate);

        purchaseOrder.variantPurchaseds.push(...variantsToPurchaseToUpdate);
      }

      /**
       * reported quantities treatement
       * create child with status = PENDING and add variantsPurchase
       * with state PENDING
       */
      if (reportedVariantsToPurchase && reportedVariantsToPurchase.length > 0) {
        const child = new PurchaseOrder();

        child.reference = await this._purchaseOrderReferenceService.generate(
          purchaseOrder,
          true,
        );
        child.status = OperationStatus.PENDING;
        child.parent = purchaseOrder;
        child.storagePoint = purchaseOrder.storagePoint;

        // if (purchaseOrder.order) {
        //   child.order = purchaseOrder.order;
        //   child.orderRef = purchaseOrder.order.reference;
        // }

        // if (purchaseOrder.internalNeed) {
        //   child.internalNeed = purchaseOrder.internalNeed;
        // }

        if (!isNullOrWhiteSpace(purchaseOrder.orderRef)) {
          child.orderRef = purchaseOrder.orderRef;
        }

        child.createdBy = user;

        await this._purchaseOrderRepository.save(child);

        const variantsToPurchaseToAdd: VariantPurchased[] = [];

        reportedVariantsToPurchase.forEach(async (reportedLine) => {
          const {
            position,
            productVariant,
            newQuantity,
            newState,
            purchaseCost,
            supplier,
          } = reportedLine;

          const newVariantToPurchase = new VariantPurchased();

          newVariantToPurchase.position = position;
          newVariantToPurchase.quantity = newQuantity;
          newVariantToPurchase.state = OperationLineState.PENDING;

          newVariantToPurchase.variant = productVariant;
          newVariantToPurchase.variantId = productVariant.id;

          newVariantToPurchase.purchaseOrder = child;
          newVariantToPurchase.purchaseOrderId = child.id;

          newVariantToPurchase.purchaseCost = purchaseCost;

          if (supplier) {
            newVariantToPurchase.supplier = supplier;
            newVariantToPurchase.supplierId = supplier.id;
          }

          newVariantToPurchase.createdBy = user;

          variantsToPurchaseToAdd.push(newVariantToPurchase);
        });

        await this._variantPurchasedRepository.save(variantsToPurchaseToAdd);

        child.variantPurchaseds = variantsToPurchaseToAdd;
        purchaseOrder.child = child;

        await this._purchaseOrderRepository.save(child);
      }

      /**
       * canceled quantitues treatment
       * set each line state = CANCELED
       */
      if (canceledVariantsToPurchase && canceledVariantsToPurchase.length > 0) {
        const variantsToPurchaseToCancel: VariantPurchased[] = [];

        await Promise.all(
          canceledVariantsToPurchase.map(async (canceledLine) => {
            const variantPurchaseToCancel =
              await this._variantPurchasedRepository.findOne({
                where: { id: canceledLine.id },
              });

            if (
              validatedVariantsToPurchase.some(
                (validatedLine) => validatedLine.id === canceledLine.id,
              )
            ) {
              const newVariantPurchaseToCancel = new VariantPurchased();

              newVariantPurchaseToCancel.position = validatedPosition;
              newVariantPurchaseToCancel.quantity = canceledLine.newQuantity;
              newVariantPurchaseToCancel.state = OperationLineState.CANCELED;
              newVariantPurchaseToCancel.variant = canceledLine.productVariant;
              newVariantPurchaseToCancel.variantId =
                canceledLine.productVariant.id;
              newVariantPurchaseToCancel.purchaseOrder = purchaseOrder;
              newVariantPurchaseToCancel.purchaseOrderId = purchaseOrder.id;

              newVariantPurchaseToCancel.purchaseCost =
                canceledLine.purchaseCost;

              if (canceledLine.supplier) {
                newVariantPurchaseToCancel.supplier = canceledLine.supplier;
                newVariantPurchaseToCancel.supplierId =
                  canceledLine.supplier.id;
              }

              newVariantPurchaseToCancel.canceledBy = user;

              variantsToPurchaseToCancel.push(newVariantPurchaseToCancel);
              validatedPosition++;
            } else {
              variantPurchaseToCancel.state = OperationLineState.CANCELED;

              variantsToPurchaseToCancel.push(variantPurchaseToCancel);
            }
          }),
        );

        if (variantsToPurchaseToCancel.length > 0) {
          await this._variantPurchasedRepository.save(
            variantsToPurchaseToCancel,
          );

          purchaseOrder.variantPurchaseds.push(...variantsToPurchaseToCancel);
        }
      }

      /**
       * Create a PENDING, PURCHASE_ORDER reception
       * on the delivery storage-point with validatedVariantsToPurchase
       */
      const reception = new Reception();

      reception.reference =
        await this._recepetionReferenceService.generateReference(
          reception,
          false,
        );

      reception.type = ReceptionType.PURCHASE_ORDER;
      reception.status = OperationStatus.PENDING;
      reception.purchaseOrder = purchaseOrder;
      reception.purchaseOrderId = purchaseOrder.id;
      reception.storagePoint = purchaseOrder.storagePoint;
      reception.storagePointId = purchaseOrder.storagePointId;

      if (purchaseOrder.order) {
        reception.order = purchaseOrder.order;
        reception.orderId = purchaseOrder.order.id;
      }

      await this._receptionRepository.save(reception);

      /**
       * Create and add variantReceptions on reception
       * from validatedVariantsToPurchase
       */
      const variantsToReceptionToAdd: VariantReception[] = [];

      let receptionPosition = 0;
      validatedVariantsToPurchase.map(async (validatedLine) => {
        const {
          productVariant,
          newQuantity,
          purchaseCost,
          supplier,
          ...datas
        } = validatedLine;

        if (
          productVariant.product.productType === ProductType.SIMPLE &&
          newQuantity > 0
        ) {
          const newVariantReception = new VariantReception();

          newVariantReception.quantity = newQuantity;
          newVariantReception.state = OperationLineState.PENDING;
          newVariantReception.position = receptionPosition;
          newVariantReception.reception = reception;
          newVariantReception.receptionId = reception.id;
          newVariantReception.variantId = productVariant.id;
          newVariantReception.productVariant = productVariant;

          newVariantReception.purchaseCost = purchaseCost;

          if (validatedLine.supplier) {
            newVariantReception.supplier = supplier;
            newVariantReception.supplierId = supplier.id;
          }

          newVariantReception.createdBy = user;

          variantsToReceptionToAdd.push(newVariantReception);
          receptionPosition++;
        }

        if (
          (productVariant.product.productType === ProductType.BUNDLED ||
            productVariant.product.productType === ProductType.GROUPED) &&
          newQuantity > 0
        ) {
          productVariant.children.map(async (composition) => {
            const child = await this._productVariantRepository.findOne({
              where: { id: composition.childId },
            });

            const newVariantReception = new VariantReception();

            newVariantReception.quantity = composition.defaultQuantity;
            newVariantReception.state = OperationLineState.PENDING;
            newVariantReception.position = receptionPosition;
            newVariantReception.reception = reception;
            newVariantReception.receptionId = reception.id;
            newVariantReception.variantId = child.id;
            newVariantReception.productVariant = child;

            newVariantReception.purchaseCost = child.purchaseCost;

            if (validatedLine.supplier) {
              newVariantReception.supplier = supplier;
              newVariantReception.supplierId = supplier.id;
            }

            newVariantReception.createdBy = user;

            variantsToReceptionToAdd.push(newVariantReception);
            receptionPosition++;
          });
        }
      });

      await this._variantReceptionRepository.save(variantsToReceptionToAdd);

      reception.variantReceptions = variantsToReceptionToAdd;

      await this._receptionRepository.save(reception);

      /**
       * If order
       * If reportedVariants.length === 0 && canceledVariants.length === 0
       * *** If purchaseOrder.storagePoint === order.storagePoint
       * ******* Set orderStatus to TO_RECEIVED
       * ******* Set orderStep to AWAITING_RECEPTION
       * *** Else
       * ******* Set orderStatus to TO_RECEIVED
       * ******* Set orderStep to IN_TRANSIT
       * Else
       * *** Set orderStatus to TO_TREAT
       * *** Set orderStep to TREATMENT_IN_PROGRESS
       */
      if (purchaseOrder.order) {
        const order = await this._orderRepository.findOne({
          where: { id: purchaseOrder.order.id },
        });

        const actualState = order.orderStep;
        const actualStatus = order.orderStatus;

        // If reportedVariants.length === 0 && canceledVariants.length === 0
        if (
          reportedVariantsToPurchase.length === 0 &&
          canceledVariantsToPurchase.length === 0
        ) {
          // If purchaseOrder.storagePoint === order.storagePoint
          if (purchaseOrder.storagePointId === order.storagePointId) {
            /**
             * Set orderStatus to TO_RECEIVED
             * Set orderStep to AWAITING_RECEPTION
             */
            order.orderStatus = StepStatus.TO_RECEIVED;
            order.orderStep = OrderStep.AWAITING_RECEPTION;
          } else {
            /**
             * Set orderStatus to TO_RECEIVED
             * Set orderStep to IN_TRANSIT
             */
            order.orderStatus = StepStatus.TO_RECEIVED;
            order.orderStep = OrderStep.IN_TRANSIT;
          }
        } else {
          /**
           * Set orderStatus to TO_TREAT
           * Set orderStep to TREATMENT_IN_PROGRESS
           */
          order.orderStatus = StepStatus.TO_TREAT;
          order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;
        }

        await this._orderRepository.save(order);

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

        purchaseOrder.order = order;
        purchaseOrder.orderRef = order.reference;
      }

      if (purchaseOrder.transfert) {
        const transfert = await this._transfertRepository.findOne({
          where: { id: purchaseOrder.transfert.id },
        });

        if (transfert) {
          transfert.status = TransfertStatus.CONFIRMED;

          await this._transfertRepository.save(transfert);
        } else {
          console.log(
            `The transfer link to the PO ${purchaseOrder.reference} have not been found`,
          );
        }
      }

      purchaseOrder.status = OperationStatus.VALIDATED;
      purchaseOrder.validatedBy = user;
      purchaseOrder.validatedAt = new Date();

      await this._purchaseOrderRepository.save(purchaseOrder);

      /**
       * Build and return the output
       */
      const output = await this._purchaseOrderRepository.findOne({
        where: { id: purchaseOrder.id },
        relations: [
          'storagePoint',
          'variantPurchaseds',
          'parent',
          'child',
          'order',
          'internalNeed',
          'receptions',
        ],
      });

      const variantsToPurchase: VariantsToPurchaseModel[] = [];
      await Promise.all(
        output.variantPurchaseds.map(async (variantPurchased) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: variantPurchased.variantId },
            relations: ['product', 'attributeValues', 'children'],
          });

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          variantsToPurchase.push({ variantPurchased, variantDetails });
        }),
      );

      const receptionsToPush: Reception[] = [];
      await Promise.all(
        output.receptions.map(async (reception) => {
          reception = await this._receptionRepository.findOne({
            where: { id: reception.id },
            relations: ['storagePoint', 'child'],
          });
          receptionsToPush.push(reception);
        }),
      );

      output.receptions = receptionsToPush;

      const purchaseOrderModel: PurchaseOrderModel = {
        purchaseOrder: output,
        variantsToPurchase,
      };

      return new PurchaseOrderItemOutput(purchaseOrderModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidatePurchaseOrderService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ValidatePurchaseOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the purchase order
       */
      const purchaseOrder = await this._purchaseOrderRepository.findOne({
        where: { id: input.purchaseOrderId },
        relations: [
          'variantPurchaseds',
          'parent',
          'child',
          'order',
          'storagePoint',
          'internalNeed',
          'transfert',
        ],
      });

      if (!purchaseOrder) {
        throw new NotFoundException(
          `Purchase order you are trying to validate is not found`,
        );
      }

      // Is the purchase order is PENDING or SAVED ?
      if (
        purchaseOrder.status !== OperationStatus.PENDING &&
        purchaseOrder.status !== OperationStatus.SAVED
      ) {
        throw new BadRequestException(
          `You cannot validate ${purchaseOrder.status} purchase order.`,
        );
      }

      // Cannot validate PurchaseOrder without storagePoint
      if (!purchaseOrder.storagePoint) {
        throw new BadRequestException(
          `Cannot validate purchase order without storage point to receive`,
        );
      }

      /**
       * EditedVariantsToPurchase validation
       */
      if (
        !input.validatedVariantsToPurchase ||
        input.validatedVariantsToPurchase.length === 0
      ) {
        throw new BadRequestException(
          `Cannot validate purchase order with empty lines`,
        );
      }

      /**
       * Are all purchase order lines are taking in consideration
       */
      // if (
      //   input.validatedVariantsToPurchase.length <
      //   purchaseOrder.variantPurchaseds.length
      // ) {
      //   throw new BadRequestException(`Some purchase order lines are missing`);
      // }

      if (
        input.validatedVariantsToPurchase.some((validatedLine) => {
          const line = purchaseOrder.variantPurchaseds.find(
            (purchaseLine) =>
              purchaseLine.id === validatedLine.variantPurchasedId,
          );

          return (
            line.status === PurchaseStatusLine.OUT_OF_STOCK ||
            line.status === PurchaseStatusLine.PRICE_ISSUE ||
            line.status === PurchaseStatusLine.SELLER_DELAY ||
            line.status === PurchaseStatusLine.AWAITING_CATMAN ||
            line.status === PurchaseStatusLine.NOT_BOUGHT
          );
        })
      ) {
        throw new BadRequestException(
          `Some purchase lines you are trying to validate are ${PurchaseStatusLine.OUT_OF_STOCK} or ${PurchaseStatusLine.PRICE_ISSUE} or ${PurchaseStatusLine.SELLER_DELAY} or ${PurchaseStatusLine.AWAITING_CATMAN} or ${PurchaseStatusLine.NOT_BOUGHT}`,
        );
      }

      /**
       * If all purchase order lines are canceled
       */
      const isSomeLinesNotCanceled = input.validatedVariantsToPurchase.some(
        (line) => line.newState !== OperationLineState.CANCELED,
      );

      if (!isSomeLinesNotCanceled) {
        throw new BadRequestException(
          `You cannot validate purchase order with all lines canceled`,
        );
      }

      /**
       * Validate variants quantities
       */
      const inputVariantsQuantities: {
        variantPurchasedId: string;
        inputQuantity: number;
      }[] = [];

      input.validatedVariantsToPurchase.map((inputPurchaseLine) =>
        inputVariantsQuantities.push({
          variantPurchasedId: inputPurchaseLine.variantPurchasedId,
          inputQuantity: inputPurchaseLine.newQuantity,
        }),
      );

      purchaseOrder.variantPurchaseds.map((variantPurchased) => {
        const inputVariants = inputVariantsQuantities.filter(
          (inputVariant) =>
            inputVariant.variantPurchasedId === variantPurchased.id,
        );

        /**
         * get total input quantity
         */
        let totalInputQty = 0;
        inputVariants.map((item) => (totalInputQty += item.inputQuantity));

        console.log(
          variantPurchased.id,
          totalInputQty,
          variantPurchased.quantity,
        );

        if (totalInputQty > variantPurchased.quantity) {
          throw new BadRequestException(
            `Some input lines variants quantities are more than initial quantities`,
          );
        }

        if (totalInputQty < variantPurchased.quantity) {
          throw new BadRequestException(
            `Some input lines variants quantities are less than initial quantities`,
          );
        }
      });

      /**
       * lines treatment
       */
      const validatedVariantsToPurchase: EditedVariantsToPurchaseModel[] = [];
      const reportedVariantsToPurchase: EditedVariantsToPurchaseModel[] = [];
      const canceledVariantsToPurchase: EditedVariantsToPurchaseModel[] = [];

      let reportPosition = 0;
      await Promise.all(
        input.validatedVariantsToPurchase.map(async (inputPurchaseLine) => {
          const { variantPurchasedId, newQuantity, newState } =
            inputPurchaseLine;

          const purchaseLine = await this._variantPurchasedRepository.findOne({
            where: { id: variantPurchasedId },
            relations: ['variant', 'supplier'],
          });
          const variant = await this._productVariantRepository.findOne({
            where: { id: purchaseLine?.variantId },
            relations: ['product', 'attributeValues', 'children'],
          });
          if (!purchaseLine || !variant) {
            throw new NotFoundException(
              `The variant ${getLangOrFirstAvailableValue(
                variant.title,
                lang,
              )} is not found in purchase order lines`,
            );
          }

          if (
            purchaseLine.purchaseCost === 0 &&
            newState === OperationLineState.VALIDATED
          ) {
            throw new BadRequestException(
              'Cannot validate purchase order containing lines with purchase cost zero',
            );
          }

          /**
           * Quantity validation
           * is newQuantity <= quantity ?
           */
          if (newQuantity > purchaseLine.quantity) {
            throw new BadRequestException(
              `You cannot validate a variant quantity greater than the demand`,
            );
          }

          /**
           * Traitement de la ligne
           */
          // A line cannot remain PENDING
          if (newState === OperationLineState.PENDING) {
            throw new BadRequestException(
              `A purchase order line cannot remain ${OperationLineState.PENDING}`,
            );
          }

          /**
           * If purchase order line state = VALIDATED
           * Check the quantity and treat the line
           */
          if (newState === OperationLineState.VALIDATED) {
            const validatedPurchaseLine: EditedVariantsToPurchaseModel = {
              id: purchaseLine.id,
              position: purchaseLine.position,
              productVariant: variant,
              newQuantity,
              newState: OperationLineState.VALIDATED,
              purchaseCost: purchaseLine.purchaseCost,
              supplier: purchaseLine.supplier,
            };

            validatedVariantsToPurchase.push(validatedPurchaseLine);
          }

          /**
           * If purchase order line state = REPORTED
           */
          if (newState === OperationLineState.REPORTED) {
            const reportedPurchaseLine: EditedVariantsToPurchaseModel = {
              position: reportPosition,
              productVariant: variant,
              newQuantity,
              newState: OperationLineState.PENDING,
              purchaseCost: purchaseLine.purchaseCost,
              supplier: purchaseLine.supplier,
            };

            reportedVariantsToPurchase.push(reportedPurchaseLine);
            reportPosition++;
          }

          /**
           * If the purchase order line have been canceled
           * or newQuantity = 0
           */
          if (newState === OperationLineState.CANCELED) {
            const canceledPurchaseLine: EditedVariantsToPurchaseModel = {
              id: purchaseLine.id,
              position: purchaseLine.position,
              productVariant: variant,
              newQuantity,
              newState: OperationLineState.CANCELED,
              purchaseCost: purchaseLine.purchaseCost,
              supplier: purchaseLine.supplier,
            };

            canceledVariantsToPurchase.push(canceledPurchaseLine);
          }
        }),
      );

      // console.log(
      //   `validated lines : ${validatedVariantsToPurchase.length}`,
      //   validatedVariantsToPurchase,
      // );
      // console.log(
      //   `reported lines : ${reportedVariantsToPurchase.length}`,
      //   reportedVariantsToPurchase,
      // );
      // console.log(
      //   `canceled lines : ${canceledVariantsToPurchase.length}`,
      //   canceledVariantsToPurchase,
      // );

      // throw new BadRequestException(`work well`);

      return {
        purchaseOrder,
        validatedVariantsToPurchase,
        reportedVariantsToPurchase,
        canceledVariantsToPurchase,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidatePurchaseOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
