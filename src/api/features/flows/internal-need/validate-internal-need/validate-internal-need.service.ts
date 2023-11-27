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
import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import {
  InternalNeed,
  OtherOutput,
  VariantToOutput,
} from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import {
  InternalNeedStatus,
  OperationLineState,
  OperationStatus,
  OutputStatus,
  OutputType,
} from 'src/domain/enums/flows';
import { PurchaseType } from 'src/domain/enums/purchases';
import { EditedVariantNeededModel } from 'src/domain/interfaces/flows';
import { InternalNeedModel, VariantNeededModel } from 'src/domain/types/flows';
import {
  InternalNeedRepository,
  OtherOutputRepository,
  VariantToOutputRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SharedService } from 'src/services/utilities';
import { ValidateInternalNeedInput } from './dto';
import { OtherOutputService } from 'src/services/generals';

type ValidationResult = {
  internalNeed: InternalNeed;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateInternalNeedService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(VariantToOutput)
    private readonly _variantToOutputRepository: VariantToOutputRepository,
    private readonly _sharedService: SharedService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _otherOutputService: OtherOutputService,
  ) {}

  async validateInternalNeed(
    input: ValidateInternalNeedInput,
    user: UserCon,
  ): Promise<InternalNeedItemOutput> {
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
  ): Promise<InternalNeedItemOutput> {
    try {
      const { internalNeed, lang, user } = result;

      /**
       * Check stock availability
       * 1. Create a output with available items
       * 2. Create a purchaseOrder for unavailable items
       */
      const variantNeededsAvailable: EditedVariantNeededModel[] = [];
      const variantNeededsUnavailable: EditedVariantNeededModel[] = [];

      const otherOutput = new OtherOutput();

      otherOutput.reference =
        await this._otherOutputService.generateReference();
      otherOutput.barcode = await this._otherOutputService.generateBarCode();
      otherOutput.outputType = OutputType.INTERNAL_NEED;
      otherOutput.status = OutputStatus.PENDING;

      await this._otherOutputRepository.save(otherOutput);

      /**
       * Update variantNeededs and add to pickingList
       */
      for (const variantNeeded of internalNeed.variantNeededs) {
        const productVariant =
          await this._productVariantRepository.findOneOrFail(
            variantNeeded.productVariantId,
            { relations: ['product', 'attributeValues', 'productItems'] },
          );

        // quantity available is more or equal to the one needed
        if (productVariant.quantity.available >= variantNeeded.quantity) {
          variantNeededsAvailable.push({
            variantNeeded,
            position: variantNeeded.position,
            productVariant,
            newQuantity: variantNeeded.quantity,
          });
        }

        // quantity available is less than th one needed
        if (productVariant.quantity.available < variantNeeded.quantity) {
          const unavailableQuantity =
            variantNeeded.quantity - productVariant.quantity.available;

          variantNeededsAvailable.push({
            variantNeeded,
            position: variantNeeded.position,
            productVariant,
            newQuantity: productVariant.quantity.available,
          });

          variantNeededsUnavailable.push({
            variantNeeded,
            position: variantNeeded.position,
            productVariant,
            newQuantity: unavailableQuantity,
          });
        }
      }

      const variantsToOutputToAdd: VariantToOutput[] = [];
      let position = 0;

      await Promise.all(
        internalNeed.variantNeededs.map(async (variantNeeded) => {
          const { quantity, productVariantId, ...data } = variantNeeded;
          const variant = await this._productVariantRepository.findOneOrFail({
            id: productVariantId,
          });

          const variantToOutputToAdd = new VariantToOutput();

          variantToOutputToAdd.position = position;
          variantToOutputToAdd.quantity = quantity;
          variantToOutputToAdd.productVariantId = variant.id;
          variantToOutputToAdd.productVariant = variant;
          variantToOutputToAdd.otherOutputId = otherOutput.id;
          variantToOutputToAdd.otherOutput = otherOutput;

          variantsToOutputToAdd.push(variantToOutputToAdd);
          position++;
        }),
      );

      await this._variantToOutputRepository.save(variantsToOutputToAdd);

      otherOutput.variantsToOutput = variantsToOutputToAdd;

      await this._otherOutputRepository.save(otherOutput);

      /**
       * Create a purchaseOrder for unavailable items
       */
      if (variantNeededsUnavailable.length > 0) {
        const purchaseOrder = new PurchaseOrder();

        purchaseOrder.reference =
          await this._purchaseOrderReferenceService.generate();
        purchaseOrder.type = PurchaseType.IN_LOCAL;
        purchaseOrder.status = OperationStatus.PENDING;
        purchaseOrder.internalNeed = internalNeed;

        await this._purchaseOrderRepository.save(purchaseOrder);

        /**
         * Save variants to purchase
         */
        const variantToPurchaseToAdd: VariantPurchased[] = [];
        let position = 0;

        variantNeededsUnavailable.map((itemUnavailable) => {
          const variantToPurchase = new VariantPurchased();

          variantToPurchase.position = position;
          variantToPurchase.quantity = itemUnavailable.newQuantity;
          variantToPurchase.state = OperationLineState.PENDING;
          variantToPurchase.purchaseCost =
            itemUnavailable.productVariant.productItems.length > 0
              ? itemUnavailable.productVariant.productItems[
                  itemUnavailable.productVariant.productItems.length - 1
                ].purchaseCost
              : 0;
          variantToPurchase.variant = itemUnavailable.productVariant;
          variantToPurchase.variantId = itemUnavailable.productVariant.id;

          variantToPurchase.purchaseOrder = purchaseOrder;
          variantToPurchase.purchaseOrderId = purchaseOrder.id;

          variantToPurchaseToAdd.push(variantToPurchase);

          position++;
        });

        await this._variantPurchasedRepository.save(variantToPurchaseToAdd);

        purchaseOrder.variantPurchaseds = variantToPurchaseToAdd;

        await this._purchaseOrderRepository.save(purchaseOrder);

        internalNeed.purchaseOrder = purchaseOrder;
      }

      // Set internal need status and save
      internalNeed.status = InternalNeedStatus.VALIDATED;
      internalNeed.validatedBy = user;
      internalNeed.validatedAt = new Date();

      await this._internalNeedRepository.save(internalNeed);

      const variantNeededs: VariantNeededModel[] = [];
      for (const variantNeeded of internalNeed.variantNeededs) {
        const variant = await this._productVariantRepository.findOne(
          variantNeeded.productVariantId,
          { relations: ['product', 'attributeValues', 'productItems'] },
        );

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(variant);

        const locations =
          await this._sharedService.buildPickPackLocationsOutput(variant);

        variantNeededs.push({ variantNeeded, variantDetails, locations });
      }

      const internalNeedModel: InternalNeedModel = {
        internalNeed,
        variantNeededs,
      };

      return new InternalNeedItemOutput(internalNeedModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateInternalNeedService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: ValidateInternalNeedInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const internalNeed = await this._internalNeedRepository.findOne(
        input.internalNeedId,
        {
          relations: ['storagePoint', 'variantNeededs', 'purchaseOrder'],
        },
      );

      if (!internalNeed) {
        throw new NotFoundException(`Material requisition form not found`);
      }

      /**
       * Is user has authorization
       */
      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.DG || role === AgentRoles.WAREHOUSE_MANAGER,
        ) &&
        internalNeed.addressTo.email !== user.email
      ) {
        throw new UnauthorizedException(
          `You are not allowed to validate the material requisition form ${internalNeed.reference}`,
        );
      }

      /**
       * Can only validate SENDED internal need
       */
      if (internalNeed.status !== InternalNeedStatus.SENDED) {
        throw new BadRequestException(
          `You cannot validate the material requisition form ${internalNeed.reference}. It's already ${internalNeed.status}`,
        );
      }

      return { internalNeed, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateInternalNeedService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
