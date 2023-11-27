import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reception, VariantReception } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import {
  ReceptionRepository,
  VariantReceptionRepository,
} from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { EditItemsPurchaseCostInput } from './dto';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { ReceptionType } from 'src/domain/enums/flows';
import { ReceptionService } from 'src/services/references/flows';

type ValidationResult = {
  reception: Reception;
  variantReception: VariantReception;
  productItems: ProductItem[];
  newCost: number;
  user: UserCon;
  lang: ISOLang;
};

@Injectable()
export class EditItemsPurchaseCostService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _receptionService: ReceptionService,
  ) {}

  async editItemsPurchaseCost(
    input: EditItemsPurchaseCostInput,
    user: UserCon,
  ): Promise<ReceptionItemOutput> {
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
  ): Promise<ReceptionItemOutput> {
    try {
      const { reception, variantReception, productItems, newCost, user, lang } =
        result;

      const productItemsToEdit: ProductItem[] = [];

      // Update varintReception
      variantReception.purchaseCost = newCost;

      if (productItems.length > 0) {
        productItems.forEach((productItem) => {
          productItem.purchaseCost = newCost;
          productItem.updatedBy = user;

          productItemsToEdit.push(productItem);
        });

        await this._productItemRepository.save(productItemsToEdit);
      }

      await this._variantReceptionRepository.save(variantReception);

      const receptionModel = await this._receptionService.buildReceptionOutput(
        reception,
      );

      return new ReceptionItemOutput(receptionModel, lang);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${EditItemsPurchaseCostService.name} - ${this._tryExecution.name} - `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: EditItemsPurchaseCostInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const reception = await this._receptionRepository.findOne({
        where: { reference: input.receptionRef },
        relations: [
          'storagePoint',
          'purchaseOrder',
          'parent',
          'child',
          'variantReceptions',
        ],
      });

      if (!reception) {
        throw new NotFoundException(
          `Reception of reference ${input.receptionRef} not found`,
        );
      }

      if (
        reception.type !== ReceptionType.PURCHASE_ORDER &&
        reception.type !== ReceptionType.AUTRE_ENTREE
      ) {
        throw new BadRequestException(
          `You cannot update items purchase cost commint from ${reception.type} reception`,
        );
      }

      const variantReception = await this._variantReceptionRepository.findOne({
        where: { id: input.variantReceptionId },
        relations: ['productVariant'],
      });

      if (!variantReception) {
        throw new NotFoundException(
          `The reception line you provided was not found`,
        );
      }

      if (
        !reception.variantReceptions.find(
          (line) => line.id === variantReception.id,
        )
      ) {
        throw new BadRequestException(
          `The reception line you provided do not belong to the reception ${reception.reference}`,
        );
      }

      if (Number.isNaN(input.newCost) || input.newCost <= 0) {
        throw new HttpException(
          `Invalid fields: newCost ${input.newCost}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const variantItems = await this._productItemRepository.find({
        where: {
          productVariantId: variantReception.variantId,
        },
        relations: ['stockMovements'],
      });

      const productItems = variantItems.filter((item) =>
        item.stockMovements.find(
          (stockMovement) => stockMovement.receptionId === reception.id,
        ),
      );

      console.log(productItems);

      return {
        reception,
        variantReception,
        productItems,
        newCost: input.newCost,
        user,
        lang,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditItemsPurchaseCostService.name} - ${this._tryValidation.name} - `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
