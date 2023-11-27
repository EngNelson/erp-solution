import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { MobileUnitItemOutput } from 'src/domain/dto/flows';
import {
  MobileUnit,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import {
  MobileUnitStatus,
  StatusLine,
  StepStatus,
  TransfertStatus,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  MobileUnitRepository,
  TransfertRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { MobileUnitReferenceService } from 'src/services/references/flows';
import { AddMobileUnitInput } from './dto';
import { MobileUnitService } from 'src/services/generals';

type ValidationResult = {
  transfert: Transfert;
  productItems: ProductItem[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddMobileUnitService {
  constructor(
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _modileUnitReferenceService: MobileUnitReferenceService,
    private readonly _mobileUnitService: MobileUnitService,
  ) {}

  async addMobileUnit(
    input: AddMobileUnitInput,
    user: UserCon,
  ): Promise<MobileUnitItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddMobileUnitInput,
    result: ValidationResult,
  ): Promise<MobileUnitItemOutput> {
    const mobileUnit = new MobileUnit();

    try {
      const { transfert, productItems, lang, user } = result;

      mobileUnit.reference = await this._modileUnitReferenceService.generate();
      mobileUnit.name = input.name;
      mobileUnit.description = input.description ? input.description : null;
      mobileUnit.password = input.password ? input.password : null;
      mobileUnit.status = MobileUnitStatus.CLOSED;

      mobileUnit.transfert = transfert;
      mobileUnit.transfertId = transfert.id;
      mobileUnit.productItems = productItems;

      mobileUnit.createdBy = user;

      await this._mobileUnitRepository.save(mobileUnit);

      if (productItems.length > 0) {
        productItems.map((productItem) => {
          productItem.mobileUnit = mobileUnit;
          productItem.mobileUnitId = mobileUnit.id;

          return productItem;
        });

        await this._productItemRepository.save(productItems);
      }

      productItems.map((productItem) => {
        transfert.variantTransferts.map((variantTransfert) => {
          if (variantTransfert.variantId === productItem.productVariantId) {
            variantTransfert.pickedQuantity++;
          }

          if (variantTransfert.quantity === variantTransfert.pickedQuantity) {
            variantTransfert.status = StatusLine.PACKED;
          }

          return variantTransfert;
        });
      });

      await this._variantTransfertRepository.save(transfert.variantTransferts);

      const mobileUnitModel =
        await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

      return new MobileUnitItemOutput(mobileUnitModel, lang);
    } catch (error) {
      console.log(error);

      if (mobileUnit.id) {
        this._mobileUnitRepository.delete(mobileUnit.id);
        this._mobileUnitRepository.save(mobileUnit);
      }

      throw new ConflictException(
        `${AddMobileUnitService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddMobileUnitInput,
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
        { relations: ['variantTransferts'] },
      );
      if (!transfert) {
        throw new NotFoundException(`Transfert not found`);
      }

      /**
       * Can only add a mobile unit on a CONFIRMED transfert
       */
      if (transfert.status !== TransfertStatus.CONFIRMED) {
        throw new BadRequestException(
          `The transfert ${transfert.reference} is ${transfert.status}. You cannot add a mobile unit to it.`,
        );
      }

      /**
       * Check if this transfer already has a mobile unit
       * with the same name as the one in input
       */
      const isMobileUnitExist = await this._mobileUnitRepository.findOne({
        transfertId: transfert.id,
        name: input.name,
      });
      if (isMobileUnitExist) {
        throw new BadRequestException(
          `The transfer ${transfert.reference} already contains a mobile unit with the name ${input.name}. Please enter another name`,
        );
      }

      /**
       * Get product items
       * And then  check if each item added have
       * his variant on the transfert
       */
      const productItems: ProductItem[] = [];

      if (input.itemBarCodes && input.itemBarCodes.length > 0) {
        await Promise.all(
          input.itemBarCodes.map(async (barCode) => {
            const productItem = await this._productItemRepository.findOne(
              { barcode: barCode },
              { relations: ['location', 'productVariant'] },
            );

            if (!productItem) {
              throw new NotFoundException(
                `The product of barcode "${barCode}" is not found`,
              );
            }

            if (
              productItem.state !== ItemState.AVAILABLE ||
              productItem.status !== StepStatus.IN_STOCK
            ) {
              throw new HttpException(
                `The product of barcode ${barCode} is not available in stock`,
                HttpStatus.BAD_REQUEST,
              );
            }

            if (
              !transfert.variantTransferts.some(
                (transfertLine) =>
                  transfertLine.variantId === productItem.productVariantId,
              )
            ) {
              throw new NotFoundException(
                `The product of barcode ${barCode} is not within the transfert ${transfert.reference}`,
              );
            }

            productItems.push(productItem);
          }),
        );
      }

      // throw new BadRequestException(`work`);

      return { transfert, productItems, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddMobileUnitService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
