import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import {
  MobileUnit,
  OrderProcessing,
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
import {
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StepStatus,
  TransfertStatus,
} from 'src/domain/enums/flows';
import {
  TransfertModel,
  VariantsToTransfertModel,
} from 'src/domain/types/flows';
import {
  MobileUnitRepository,
  OrderProcessingRepository,
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
import { SharedService } from 'src/services/utilities';
import { CancelTransfertInput } from './dto';
import {
  MobileUnitService,
  OrderService,
  ProductsService,
} from 'src/services/generals';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import { ReceptionService } from 'src/services/references/flows';
import { VariantItemsModel } from 'src/domain/interfaces/i.variant-items.model';
import { ItemState } from 'src/domain/enums/items';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { ArticlesOrderedType } from 'src/domain/types/orders';
import { AskVariantToTransfertModel } from 'src/domain/interfaces/flows';
import { ProductVariantToPurchaseModel } from 'src/domain/interfaces/purchases';
import { AvailabilityStatus, OrderStep } from 'src/domain/enums/orders';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { OrderReferenceService } from 'src/services/references/orders';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';

type ValidationResult = {
  transfert: Transfert;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelTransfertService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _sharedService: SharedService,
    private readonly _mobileUnitService: MobileUnitService,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _orderService: OrderService,
    private readonly _productsService: ProductsService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async cancelTransfert(
    input: CancelTransfertInput,
    user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
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
  ): Promise<TransfertItemDetailsOutput> {
    try {
      const { transfert, lang, user } = result;

      transfert.status = TransfertStatus.CANCELED;
      transfert.canceledBy = user;
      transfert.canceledAt = new Date();

      const variantToTransfertToCancel: VariantTransfert[] = [];
      transfert.variantTransferts.forEach(async (variantTransfert) => {
        variantTransfert.state = OperationLineState.CANCELED;

        variantToTransfertToCancel.push(variantTransfert);
      });

      /**
       * Cancel treatments
       */
      const mobileUnitsToUpdate: MobileUnit[] = [];
      const productItemsToUpdate: ProductItem[] = [];
      const variantsToReceived: VariantItemsModel[] = [];
      const variantsToUpdate: ProductVariant[] = [];

      const reception = new Reception();

      reception.reference =
        await this._receptionReferenceService.generateReference();
      reception.type = ReceptionType.CANCEL_TRANSFERT;
      reception.status = OperationStatus.PENDING;
      reception.storagePoint = transfert.source;
      reception.storagePointId = transfert.sourceId;
      reception.createdBy = user;

      if (transfert.mobileUnits && transfert.mobileUnits.length > 0) {
        for (const mobileUnit of transfert.mobileUnits) {
          const productItems = await this._productItemRepository.find({
            where: { mobileUnitId: mobileUnit.id },
            relations: ['productVariant'],
          });
          if (productItems && productItems.length > 0) {
            if (!reception.id) {
              await this._receptionRepository.save(reception);
            }

            for (const item of productItems) {
              const productVariant = item.productVariant;

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
              const qtyPropertyToRemove =
                this._sharedService.getQuantityProperty(item.state);

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

              item.state = ItemState.PENDING_RECEPTION;
              item.status = StepStatus.TO_RECEIVED;
              item.receptionId = reception.id;
              item.reception = reception;

              productItemsToUpdate.push(item);
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

            await this._variantReceptionRepository.save(
              variantsToReceivedToAdd,
            );

            reception.variantReceptions = variantsToReceivedToAdd;
            reception.productItems = productItemsToUpdate;

            await this._receptionRepository.save(reception);
          }

          mobileUnit.productItems = [];
          mobileUnitsToUpdate.push(mobileUnit);
        }

        await this._mobileUnitRepository.save(mobileUnitsToUpdate);
      }

      await this._variantTransfertRepository.save(variantToTransfertToCancel);

      await this._transfertRepository.save(transfert);

      /**
       * If is an order to_transfer, set order status and state
       */
      if (transfert.order) {
        const order = await this._orderRepository.findOne({
          where: { id: transfert.orderId },
          relations: ['storagePoint', 'articleOrdereds', 'purchaseOrder'],
        });

        const articlesOrderedType: ArticlesOrderedType[] = [];

        if (
          order &&
          order.articleOrdereds &&
          order.articleOrdereds.length > 0
        ) {
          const actualState = order.orderStep;
          const actualStatus = order.orderStatus;

          await Promise.all(
            order.articleOrdereds.map(async (articleOrdered) => {
              articleOrdered.productVariant =
                await this._productVariantRepository.findOne({
                  where: { id: articleOrdered.productVariantId },
                });
              return articleOrdered;
            }),
          );

          order.articleOrdereds.forEach((line) => {
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

          // If all variants available in storage point
          if (variantsAvailabilities?.status === AvailabilityStatus.ALL) {
            order.orderStatus = StepStatus.TO_PICK_PACK;
            order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;
          } else if (
            variantsAvailabilities?.status === AvailabilityStatus.SOME
          ) {
            order.orderStatus = StepStatus.TO_TREAT;
            order.orderStep = OrderStep.TREATMENT_IN_PROGRESS;
          } else if (
            variantsAvailabilities?.status === AvailabilityStatus.NONE
          ) {
            order.orderStatus = StepStatus.TO_BUY;
            order.orderStep = OrderStep.PURCHASE_IN_PROGRESS;
          } else {
            console.log('Something wrong appened !. Please try again');
          }

          if (missingVariants && missingVariants.length > 0) {
            const variantsToPurchased: ProductVariantToPurchaseModel[] = [];

            for (const missingVariant of missingVariants) {
              const { variant, missingQty, localisations } = missingVariant;

              const lastSupplier =
                await this._productsService.getLastSupplierAndPurchaseCost(
                  variant,
                );

              const purchaseCost = lastSupplier.supplier
                ? lastSupplier.purchaseCost
                : await this._productsService.getVariantAveragePurchaseCost(
                    variant,
                  );

              variantsToPurchased.push({
                productVariant: variant,
                quantity: missingQty,
                purchaseCost,
                supplier: lastSupplier.supplier,
              });
            }

            /**
             * If variantsToPurchased.lenght > 0
             * ***** Create purchaseOrder
             */
            if (variantsToPurchased.length > 0) {
              let purchaseOrder: PurchaseOrder;
              if (
                order.purchaseOrder &&
                order.purchaseOrder.status === OperationStatus.PENDING
              ) {
                purchaseOrder = await this._purchaseOrderRepository.findOne({
                  where: { id: order.purchaseOrder.id },
                  relations: ['variantPurchaseds'],
                });
              } else {
                purchaseOrder = new PurchaseOrder();

                purchaseOrder.reference =
                  await this._purchaseOrderReferenceService.generate();
              }

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

                if (
                  (purchaseOrder.variantPurchaseds &&
                    purchaseOrder.variantPurchaseds.length > 0 &&
                    !purchaseOrder.variantPurchaseds.find(
                      (variantPurchased) =>
                        variantPurchased.variantId === productVariant.id,
                    )) ||
                  !purchaseOrder.variantPurchaseds
                ) {
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
              }

              await this._variantPurchasedRepository.save(
                variantsToPurchasedToAdd,
              );

              order.purchaseOrder = purchaseOrder;

              /**
               * If the transfer has a Pending PO
               * Cancel the PO
               */
              if (
                transfert.purchaseOrder &&
                transfert.purchaseOrder.id !== purchaseOrder.id &&
                transfert.purchaseOrder.status === OperationStatus.PENDING
              ) {
                const poToCancel = await this._purchaseOrderRepository.findOne({
                  where: { id: transfert.purchaseOrder.id },
                  relations: ['variantPurchaseds'],
                });

                if (poToCancel) {
                  poToCancel.status = OperationStatus.CANCELED;
                  poToCancel.canceledAt = new Date();
                  poToCancel.canceledBy = user;

                  if (
                    poToCancel.variantPurchaseds &&
                    poToCancel.variantPurchaseds.length > 0
                  ) {
                    const variantPurchasedsToCancel: VariantPurchased[] = [];
                    poToCancel.variantPurchaseds.forEach((variantPurchased) => {
                      variantPurchased.state = OperationLineState.CANCELED;
                      variantPurchased.canceledAt = new Date();
                      variantPurchased.canceledBy = user;

                      variantPurchasedsToCancel.push(variantPurchased);
                    });

                    await this._variantPurchasedRepository.save(
                      variantPurchasedsToCancel,
                    );
                  }

                  await this._purchaseOrderRepository.save(poToCancel);
                }
              }
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

            order.orderProcessings = [orderPrecessing];
          }
        }
      }

      const output = await this._transfertRepository.findOne(transfert.id, {
        relations: [
          'source',
          'target',
          'parent',
          'child',
          'mobileUnits',
          'variantTransferts',
          'order',
        ],
      });

      const variantsToTransfert: VariantsToTransfertModel[] = [];
      for (const variantTransfert of output.variantTransferts) {
        const variant = await this._productVariantRepository.findOne(
          variantTransfert.variantId,
          { relations: ['product', 'attributeValues', 'productItems'] },
        );

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(variant);

        const locations =
          await this._sharedService.buildPickPackLocationsOutput(variant);

        variantsToTransfert.push({
          variantTransfert,
          variantDetails,
          locations,
        });
      }

      const mobileUnits: MobileUnitModel[] = [];

      if (output.mobileUnits && output.mobileUnits.length > 0) {
        for (const mobileUnit of output.mobileUnits) {
          if (mobileUnit.productItems && mobileUnit.productItems.length > 0) {
            await Promise.all(
              mobileUnit.productItems.map(async (item) => {
                item.productVariant =
                  await this._productVariantRepository.findOne({
                    where: { id: item.productVariantId },
                  });

                return item;
              }),
            );
          }

          const mobileUnitModel =
            await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

          mobileUnits.push(mobileUnitModel);
        }
      }

      const transfertModel: TransfertModel = {
        transfert: output,
        mobileUnits,
        variantsToTransfert,
      };

      return new TransfertItemDetailsOutput(transfertModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelTransfertService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: CancelTransfertInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const transfert = await this._transfertRepository.findOne(
        input.transfertId,
        {
          relations: [
            'variantTransferts',
            'source',
            'mobileUnits',
            'order',
            'purchaseOrder',
          ],
        },
      );
      if (!transfert) {
        throw new NotFoundException(
          `Transfert with id '${input.transfertId}' not found`,
        );
      }

      /**
       * Cannot cancel VALIDATED transfert
       */
      if (
        transfert.status === TransfertStatus.VALIDATED ||
        transfert.status === TransfertStatus.CANCELED
      ) {
        throw new BadRequestException(
          `You cannot cancel a ${transfert.status} transfert`,
        );
      }

      return { transfert, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelTransfertService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
