import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { OtherOutput, VariantToOutput } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OutputStatus, OutputType } from 'src/domain/enums/flows';
import { ProductType } from 'src/domain/enums/items';
import { CommentModel } from 'src/domain/interfaces';
import {
  OtherOutputModel,
  ProductVariantToOutputModel,
  VariantToOutputModel,
} from 'src/domain/interfaces/flows';
import {
  OtherOutputRepository,
  VariantToOutputRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { OtherOutputService } from 'src/services/generals';
import { SharedService, UserService } from 'src/services/utilities';
import { AddOtherOutputInput } from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  variantsToOutput: ProductVariantToOutputModel[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddOtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(VariantToOutput)
    private readonly _variantToOutputRepository: VariantToOutputRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _otherOutputService: OtherOutputService,
    private readonly _userService: UserService,
    private readonly _sharedService: SharedService,
  ) {}

  async addOtherOutput(
    input: AddOtherOutputInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
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
    input: AddOtherOutputInput,
    result: ValidationResult,
  ): Promise<OtherOutputItemOutput> {
    const otherOutput = new OtherOutput();

    try {
      const { storagePoint, variantsToOutput, lang, user } = result;

      otherOutput.reference =
        await this._otherOutputService.generateReference();
      otherOutput.barcode = await this._otherOutputService.generateBarCode();
      otherOutput.outputType = input.outputType;
      otherOutput.status = OutputStatus.PENDING;
      otherOutput.storagePointId = storagePoint.id;
      otherOutput.storagePoint = storagePoint;

      if (!isNullOrWhiteSpace(input.magentoOrderID))
        otherOutput.magentoOrderID = input.magentoOrderID;

      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        const comment: CommentModel = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };

        otherOutput.comments = [comment];
      }

      otherOutput.createdBy = user;

      await this._otherOutputRepository.save(otherOutput);

      const variantsToOutputToAdd: VariantToOutput[] = [];
      const variantsToOutputModel: VariantToOutputModel[] = [];
      let position = 0;

      await Promise.all(
        variantsToOutput.map(async (variantToOutput) => {
          const { article, quantity } = variantToOutput;

          const variantToOutputToAdd = new VariantToOutput();

          variantToOutputToAdd.position = position;
          variantToOutputToAdd.quantity = quantity;
          variantToOutputToAdd.productVariantId = article.id;
          variantToOutputToAdd.productVariant = article;
          variantToOutputToAdd.otherOutputId = otherOutput.id;
          variantToOutputToAdd.otherOutput = otherOutput;
          variantToOutputToAdd.createdBy = user;

          variantsToOutputToAdd.push(variantToOutputToAdd);
          position++;

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(article);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(article);

          variantsToOutputModel.push({
            variantToOutput: variantToOutputToAdd,
            variantDetails,
            locations,
          });
        }),
      );

      await this._variantToOutputRepository.save(variantsToOutputToAdd);

      otherOutput.variantsToOutput = variantsToOutputToAdd;

      await this._otherOutputRepository.save(otherOutput);

      // console.log(variantsToOutputModel);

      const otherOutputModel: OtherOutputModel = {
        otherOutput,
        variantsToOutput: variantsToOutputModel,
      };

      return new OtherOutputItemOutput(otherOutputModel, lang);
    } catch (error) {
      console.log(error);

      if (otherOutput.id) {
        const articlesToOutput = await this._variantToOutputRepository.find({
          where: { otherOutputId: otherOutput.id },
        });
        const ids: string[] = [];
        articlesToOutput.map((articleToOutput) => ids.push(articleToOutput.id));

        await this._variantToOutputRepository.delete(ids);
        await this._otherOutputRepository.delete(otherOutput.id);
      }

      throw new ConflictException(
        `${AddOtherOutputService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddOtherOutputInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the storage point
       */
      const storagePoint = await this._storagePointRepository.findOne({
        where: { reference: input.storagePointRef },
      });

      if (!storagePoint) {
        throw new NotFoundException(
          `The warehouse '${input.storagePointRef}' was not found.`,
        );
      }

      /**
       * magentoOrderID validation
       */
      if (
        isNullOrWhiteSpace(input.magentoOrderID) &&
        (input.outputType === OutputType.FLEET_OUTPUT ||
          input.outputType === OutputType.PUS_OUTPUT ||
          input.outputType === OutputType.SAV_OUTPUT ||
          input.outputType === OutputType.SUPPLIER_OUTPUT)
      ) {
        throw new BadRequestException(
          `Magento order ID is required for ${input.outputType}`,
        );
      }

      /**
       * variantsToOutput treatment and build ProductVariantToOutputModel[]
       */
      const variantsToOutput: ProductVariantToOutputModel[] = [];

      await Promise.all(
        input.variantsToOutput.map(async (variantToOutput) => {
          const { productVariantId, quantity } = variantToOutput;

          const article = await this._productVariantRepository.findOne(
            productVariantId,
            {
              relations: [
                'product',
                'attributeValues',
                'productItems',
                'children',
              ],
            },
          );

          if (!article) {
            throw new NotFoundException(`Article not found.`);
          }

          if (article.product.productType !== ProductType.SIMPLE) {
            throw new BadRequestException(
              `You cannot perform an output of a ${article.product.productType}`,
            );
          }

          if (Number.isNaN(quantity) || quantity <= 0) {
            throw new HttpException(
              `Invalid fields: quantity ${quantity}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          variantsToOutput.push({ article, quantity });
        }),
      );

      return { storagePoint, variantsToOutput, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddOtherOutputService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
