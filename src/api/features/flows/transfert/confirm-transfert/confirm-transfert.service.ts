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
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import { Transfert, VariantTransfert } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import {
  OperationLineState,
  OperationStatus,
  StatusLine,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import { EditedVariantsToTransfertModel } from 'src/domain/interfaces';
import {
  TransfertModel,
  VariantsToTransfertModel,
} from 'src/domain/types/flows';
import {
  TransfertRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { TransfertService } from 'src/services/references/flows';
import { SharedService } from 'src/services/utilities';
import { ConfirmTransfertInput } from './dto';
import { MobileUnitService } from 'src/services/generals';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import {
  PurchaseOrderRepository,
  SupplierRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { AvailabilityStatus } from 'src/domain/enums/orders';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';

type ValidationResult = {
  transfert: Transfert;
  validatedVariantsToTransfert: EditedVariantsToTransfertModel[];
  reportedVariantsToTransfert: EditedVariantsToTransfertModel[];
  canceledVariantsToTransfert: EditedVariantsToTransfertModel[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ConfirmTransfertService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    private readonly _transfertService: TransfertService,
    private readonly _sharedService: SharedService,
    private readonly _mobileUnitService: MobileUnitService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
  ) {}

  async confirmTransfert(
    input: ConfirmTransfertInput,
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
      const {
        transfert,
        validatedVariantsToTransfert,
        reportedVariantsToTransfert,
        canceledVariantsToTransfert,
        lang,
        user,
      } = result;

      /**
       * validated quantities treatement
       * set transfert status to CONFIRMED
       * update each line quantities and state to VALIDATED
       */
      let validatedPosition = 0;
      if (
        validatedVariantsToTransfert &&
        validatedVariantsToTransfert.length > 0
      ) {
        const variantsToTransfertToUpdate: VariantTransfert[] = [];

        /**
         * Create the picking list
         */

        await Promise.all(
          validatedVariantsToTransfert.map(async (validatedLine) => {
            const variantToTransfert =
              await this._variantTransfertRepository.findOne(validatedLine.id);

            variantToTransfert.quantity = validatedLine.newQuantity;
            variantToTransfert.state = validatedLine.newState;

            variantsToTransfertToUpdate.push(variantToTransfert);
            validatedPosition++;
          }),
        );

        await this._variantTransfertRepository.save(
          variantsToTransfertToUpdate,
        );
      }

      /**
       * reported quantities treatement
       * create child with status = PENDING and add variantsTransfert
       * with state PENDING
       */
      if (
        reportedVariantsToTransfert &&
        reportedVariantsToTransfert.length > 0
      ) {
        const child = new Transfert();

        child.reference = await this._transfertService.generateReference(
          transfert,
        );
        child.type = transfert.type;
        child.status = TransfertStatus.PENDING;
        child.description = {
          fr: `Transferts reportes a partir de ${transfert.reference}`,
          en: `Reported transferts from ${transfert.reference}`,
        };
        child.isRequest = transfert.isRequest;

        child.source = transfert.source;
        child.sourceId = transfert.sourceId;

        child.target = transfert.target;
        child.targetId = transfert.targetId;

        child.parent = transfert;

        await this._transfertRepository.save(child);

        const variantsToTransfertToAdd: VariantTransfert[] = [];

        reportedVariantsToTransfert.forEach(async (reportedLine) => {
          const { position, productVariant, newQuantity, newState } =
            reportedLine;

          const newVariantToTransfert = new VariantTransfert();

          newVariantToTransfert.position = position;
          newVariantToTransfert.variant = productVariant;
          newVariantToTransfert.variantId = productVariant.id;

          newVariantToTransfert.transfert = child;
          newVariantToTransfert.transfertId = child.id;

          newVariantToTransfert.quantity = newQuantity;
          newVariantToTransfert.pickedQuantity = 0;
          newVariantToTransfert.status = StatusLine.TO_PICK_PACK;

          newVariantToTransfert.state = newState;

          variantsToTransfertToAdd.push(newVariantToTransfert);
        });

        await this._variantTransfertRepository.save(variantsToTransfertToAdd);

        child.variantTransferts = variantsToTransfertToAdd;
        transfert.child = child;

        await this._transfertRepository.save(child);
      }

      /**
       * canceled quantitues treatment
       * set each line state = CANCELED
       */
      if (
        canceledVariantsToTransfert &&
        canceledVariantsToTransfert.length > 0
      ) {
        const variantsToTransfertToCancel: VariantTransfert[] = [];

        await Promise.all(
          canceledVariantsToTransfert.map(async (canceledLine) => {
            const variantTransfertToCancel =
              await this._variantTransfertRepository.findOne(canceledLine.id);

            if (
              validatedVariantsToTransfert.some(
                (validatedLine) => validatedLine.id === canceledLine.id,
              )
            ) {
              const newVariantTransfertToCancel = new VariantTransfert();

              newVariantTransfertToCancel.position = validatedPosition;
              newVariantTransfertToCancel.quantity = canceledLine.newQuantity;
              newVariantTransfertToCancel.state = OperationLineState.CANCELED;
              newVariantTransfertToCancel.variant = canceledLine.productVariant;
              newVariantTransfertToCancel.variantId =
                canceledLine.productVariant.id;
              newVariantTransfertToCancel.transfert = transfert;
              newVariantTransfertToCancel.transfertId = transfert.id;
              newVariantTransfertToCancel.pickedQuantity = 0;
              newVariantTransfertToCancel.createdBy = user;

              variantsToTransfertToCancel.push(newVariantTransfertToCancel);
              validatedPosition++;
            } else {
              variantTransfertToCancel.state = OperationLineState.CANCELED;

              variantsToTransfertToCancel.push(variantTransfertToCancel);
            }
          }),
        );

        if (variantsToTransfertToCancel.length > 0) {
          await this._variantTransfertRepository.save(
            variantsToTransfertToCancel,
          );

          transfert.variantTransferts.push(...variantsToTransfertToCancel);
        }

        await this._variantTransfertRepository.save(
          variantsToTransfertToCancel,
        );
      }

      transfert.status = TransfertStatus.CONFIRMED;
      transfert.confirmedBy = user;
      transfert.confirmedAt = new Date();

      await this._transfertRepository.save(transfert);

      /**
       * Check variants availability and generate a purchase order
       * if necessary
       */
      if (
        validatedVariantsToTransfert &&
        validatedVariantsToTransfert.length > 0
      ) {
        const variantsAvailabilities =
          await this._transfertService.checkVariantsAvailabilities(
            validatedVariantsToTransfert,
            transfert.source,
          );

        if (variantsAvailabilities.status !== AvailabilityStatus.ALL) {
          console.log(`Create purchase order`);

          const variantsToPurchased: VariantPurchased[] = [];

          const variantsMissing = variantsAvailabilities.availabilities.filter(
            (availability) => availability.missingQty > 0,
          );

          console.log(`variantsMissing === `, variantsMissing.length);

          if (variantsMissing.length > 0) {
            let purchaseOrder: PurchaseOrder;
            if (
              !isNullOrWhiteSpace(transfert.orderId) ||
              transfert.type === TransfertType.ORDER
            ) {
              transfert.order = await this._orderRepository.findOne({
                where: { id: transfert.orderId },
                relations: ['purchaseOrder'],
              });
              if (transfert.order.purchaseOrder) {
                purchaseOrder = await this._purchaseOrderRepository.findOne({
                  where: { id: transfert.order.purchaseOrder.id },
                  relations: ['variantPurchaseds'],
                });
              }

              if (!purchaseOrder) {
                purchaseOrder = new PurchaseOrder();

                purchaseOrder.reference =
                  await this._purchaseOrderReferenceService.generate(
                    purchaseOrder,
                    false,
                  );
                purchaseOrder.createdBy = user;
              }

              purchaseOrder.order = transfert.order;
            } else {
              purchaseOrder = new PurchaseOrder();

              purchaseOrder.reference =
                await this._purchaseOrderReferenceService.generate(
                  purchaseOrder,
                  false,
                );
              purchaseOrder.createdBy = user;
            }

            purchaseOrder.status = OperationStatus.PENDING;
            purchaseOrder.storagePoint = transfert.source;
            purchaseOrder.storagePointId = transfert.sourceId;
            purchaseOrder.transfert = transfert;

            await this._purchaseOrderRepository.save(purchaseOrder);

            console.log(
              `Purchase order created or updated: ${purchaseOrder.reference}`,
            );

            let position = 0;

            console.log('start loop');

            for (const variantMissing of variantsMissing) {
              console.log(`Position: ${position}`);

              const { variant, missingQty } = variantMissing;

              if (
                (purchaseOrder.variantPurchaseds &&
                  purchaseOrder.variantPurchaseds.length > 0 &&
                  !purchaseOrder.variantPurchaseds.find(
                    (variantPurchased) =>
                      variantPurchased.variantId === variant.id,
                  )) ||
                !purchaseOrder.variantPurchaseds
              ) {
                const variantPurchased = new VariantPurchased();

                variantPurchased.position = position;
                variantPurchased.quantity = missingQty;
                variantPurchased.state = OperationLineState.PENDING;
                variantPurchased.variantId = variant.id;
                variantPurchased.variant = variant;
                let i = 0;
                console.log(`find variant last item`);

                if (variant.productItems && variant.productItems.length > 0) {
                  console.log(`find variant last item ${i}`);

                  i++;
                  const lastItem = variant.productItems.sort(
                    (item_1, item_2) =>
                      item_1.createdAt.getTime() - item_2.createdAt.getTime(),
                  )[0];

                  console.log(`Last item ${i} === ${lastItem}`);

                  variantPurchased.purchaseCost = lastItem.purchaseCost;
                  variantPurchased.customPrice = variant.salePrice;
                  const supplierId = lastItem.supplierId;
                  const supplier = await this._supplierRepository.findOne({
                    where: { id: supplierId },
                  });

                  if (supplier) {
                    variantPurchased.supplier = supplier;
                    variantPurchased.supplierId = supplierId;
                  }
                }
                variantPurchased.purchaseOrder = purchaseOrder;
                variantPurchased.purchaseOrderId = purchaseOrder.id;

                variantsToPurchased.push(variantPurchased);

                position++;
              } else {
                console.log(
                  `The product ${variant.title} is already in the PO`,
                );
              }
            }

            await this._variantPurchasedRepository.save(variantsToPurchased);

            console.log(
              `Variants to purchase saved === ${variantsToPurchased.length}`,
            );

            // await this._purchaseOrderRepository.save(purchaseOrder);

            console.log(`purchase order updated successfully`);

            transfert.status = TransfertStatus.AWAITING_PURCHASE;
            await this._transfertRepository.save(transfert);
          }
        } else {
          if (
            !isNullOrWhiteSpace(transfert.orderId) ||
            transfert.type === TransfertType.ORDER
          ) {
            const order = await this._orderRepository.findOne({
              where: { id: transfert.orderId },
              relations: ['purchaseOrder'],
            });

            let purchaseOrder: PurchaseOrder;

            if (order.purchaseOrder) {
              purchaseOrder = await this._purchaseOrderRepository.findOne({
                where: { id: order.purchaseOrder?.id },
              });
            }

            if (purchaseOrder) {
              purchaseOrder.status = OperationStatus.CANCELED;

              await this._purchaseOrderRepository.save(purchaseOrder);
            }
          }
        }
      }

      /**
       * Build and return the output
       */
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
      await Promise.all(
        output.variantTransferts.map(async (variantTransfert) => {
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
        }),
      );

      const mobileUnits: MobileUnitModel[] = [];

      if (output.mobileUnits && output.mobileUnits.length > 0) {
        await Promise.all(
          output.mobileUnits.map(async (mobileUnit) => {
            if (mobileUnit.productItems.length > 0) {
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
          }),
        );
      }

      const transfertModel: TransfertModel = {
        transfert: output,
        mobileUnits,
        variantsToTransfert,
      };

      return new TransfertItemDetailsOutput(transfertModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ConfirmTransfertService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ConfirmTransfertInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get transfert to confirm
       */
      const transfert = await this._transfertRepository.findOne(
        input.transfertId,
        {
          relations: [
            'source',
            'target',
            'parent',
            'order',
            'variantTransferts',
          ],
        },
      );
      if (!transfert) {
        throw new NotFoundException(
          `Transfert you are trying to confirm not found`,
        );
      }

      // Is transfert to confirm is PENDING
      if (
        transfert.status !== TransfertStatus.PENDING &&
        transfert.status !== TransfertStatus.AWAITING_PURCHASE
      ) {
        throw new BadRequestException(
          `You cannot confirm ${transfert.status} transfert.`,
        );
      }

      /**
       * editedVariantsToTransfert validation
       */
      if (
        !input.editedVariantsToTransfert ||
        input.editedVariantsToTransfert.length === 0
      ) {
        throw new BadRequestException(
          `Cannot confirm transfert with empty lines`,
        );
      }

      /**
       * Is all transfert lines are taking in considration
       */
      if (
        input.editedVariantsToTransfert.length <
        transfert.variantTransferts.length
      ) {
        throw new BadRequestException(`Some transfert lines are missing`);
      }

      /**
       * Si toutes les lignes du transfert sont canceled
       */
      const isSomeLinesNotCanceled = input.editedVariantsToTransfert.some(
        (line) => line.newState !== OperationLineState.CANCELED,
      );
      if (!isSomeLinesNotCanceled) {
        throw new BadRequestException(
          `You cannot confirm transfert with all lines canceled`,
        );
      }

      /**
       * variants quantities validation
       */
      const inputVariantsQuantities: {
        variantTransfertId: string;
        inputQuantity: number;
      }[] = [];
      input.editedVariantsToTransfert.forEach((inputTransfertLine) => {
        inputVariantsQuantities.push({
          variantTransfertId: inputTransfertLine.variantTransfertId,
          inputQuantity: inputTransfertLine.newQuantity,
        });
      });

      transfert.variantTransferts.forEach((variantTransfert) => {
        const inputVariants = inputVariantsQuantities.filter(
          (inputVariant) =>
            inputVariant.variantTransfertId === variantTransfert.id,
        );

        /**
         * get total input quantity
         */
        let totalInputQty = 0;
        inputVariants.forEach((item) => (totalInputQty += item.inputQuantity));

        // console.log('input ', totalInputQty, 'bd ', variantTransfert.quantity);

        if (totalInputQty > variantTransfert.quantity) {
          throw new BadRequestException(
            `Some input lines variants quantities are more than initial quantities`,
          );
        }

        if (totalInputQty < variantTransfert.quantity) {
          throw new BadRequestException(
            `Some input lines variants quantities are less than initial quantities`,
          );
        }
      });

      /**
       * lines treatement
       */
      const validatedVariantsToTransfert: EditedVariantsToTransfertModel[] = [];
      const reportedVariantsToTransfert: EditedVariantsToTransfertModel[] = [];
      const canceledVariantsToTransfert: EditedVariantsToTransfertModel[] = [];

      let reportedPosition = 0;
      await Promise.all(
        input.editedVariantsToTransfert.map(async (inputTranfertLine) => {
          const { variantTransfertId, newQuantity, newState } =
            inputTranfertLine;

          const transfertLine = await this._variantTransfertRepository.findOne(
            variantTransfertId,
            { relations: ['variant'] },
          );
          const variant = await this._productVariantRepository.findOne(
            transfertLine?.variantId,
            { relations: ['product', 'attributeValues', 'productItems'] },
          );
          if (!transfertLine || !variant) {
            throw new NotFoundException(
              `The variant ${getLangOrFirstAvailableValue(
                variant.title,
                lang,
              )} is not found in transfert lines`,
            );
          }

          /**
           * Quantity validation
           * is newQuantity <= quantity ?
           */
          if (newQuantity > transfertLine.quantity) {
            throw new BadRequestException(
              `You cannot confirm a variant quantity greater than the demand`,
            );
          }

          /**
           * Traitement de la ligne
           */
          // The transfert input line cannot remain PENDING
          if (newState === OperationLineState.PENDING) {
            throw new BadRequestException(
              `A transfert line cannot remain ${OperationLineState.PENDING}`,
            );
          }

          /**
           * If transfert input line state = VALIDATED
           */
          if (newState === OperationLineState.VALIDATED) {
            const validatedTransfertLine: EditedVariantsToTransfertModel = {
              id: transfertLine.id,
              position: transfertLine.position,
              productVariant: variant,
              newQuantity,
              newState,
            };

            validatedVariantsToTransfert.push(validatedTransfertLine);
          }

          /**
           * If transfert input line state = REPORTED
           */
          if (newState === OperationLineState.REPORTED) {
            const reportedTransfertLine: EditedVariantsToTransfertModel = {
              id: transfertLine.id,
              position: reportedPosition,
              productVariant: variant,
              newQuantity,
              newState,
            };

            reportedVariantsToTransfert.push(reportedTransfertLine);
            reportedPosition++;
          }

          /**
           * If transfert input line state = CANCELED
           */
          if (newState === OperationLineState.CANCELED) {
            const canceledTransfertLine: EditedVariantsToTransfertModel = {
              id: transfertLine.id,
              position: transfertLine.position,
              productVariant: variant,
              newQuantity,
              newState,
            };

            canceledVariantsToTransfert.push(canceledTransfertLine);
          }
        }),
      );

      /**
       * Last quantities validation
       * Validate each transfert line quantity with
       * validatedVariantsToTransfert, reportedVariantsToTransfert
       * and canceledVariantsToTransfert
       */
      transfert.variantTransferts.forEach((transfertLine) => {
        const validatedLines: EditedVariantsToTransfertModel[] = [];
        const reportedLines: EditedVariantsToTransfertModel[] = [];
        const canceledLines: EditedVariantsToTransfertModel[] = [];

        validatedVariantsToTransfert.forEach((validatedLine) => {
          if (transfertLine.id === validatedLine.id) {
            validatedLines.push(validatedLine);
          }
        });

        reportedVariantsToTransfert.forEach((reportedLine) => {
          if (transfertLine.id === reportedLine.id) {
            reportedLines.push(reportedLine);
          }
        });

        canceledVariantsToTransfert.forEach((canceledLine) => {
          if (transfertLine.id === canceledLine.id) {
            canceledLines.push(canceledLine);
          }
        });

        const allInputTransfertLine = validatedLines.concat(
          reportedLines.concat(canceledLines),
        );

        let inputLineQuantity = 0;
        allInputTransfertLine.forEach(
          (inputLine) => (inputLineQuantity += inputLine.newQuantity),
        );

        if (inputLineQuantity > transfertLine.quantity) {
          throw new BadRequestException(
            `The variant ${getLangOrFirstAvailableValue(
              transfertLine.variant.title,
              lang,
            )} quantity is more than expected`,
          );
        }

        if (inputLineQuantity < transfertLine.quantity) {
          throw new BadRequestException(
            `The variant ${getLangOrFirstAvailableValue(
              transfertLine.variant.title,
              lang,
            )} quantity is less than expected`,
          );
        }
      });

      return {
        transfert,
        validatedVariantsToTransfert,
        reportedVariantsToTransfert,
        canceledVariantsToTransfert,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${ConfirmTransfertService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
