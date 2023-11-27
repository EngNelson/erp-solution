import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { VariantProductItemsOutput } from 'src/domain/dto/items';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import { Location } from 'src/domain/entities/warehouses';
import { VariantProductItemsOutputModel } from 'src/domain/interfaces/items';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { LocationRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities';
import {
  GetLocationProductItemsInput,
  GetLocationProductItemsOutput,
} from './dto';

type ValidationResult = {
  location: Location;
  lang?: ISOLang;
};

@Injectable()
export class GetLocationProductItemsService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getLocationProductItems(
    input: GetLocationProductItemsInput,
    user: UserCon,
  ): Promise<GetLocationProductItemsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetLocationProductItemsOutput =
      await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<GetLocationProductItemsOutput> {
    try {
      const { location, lang } = result;

      const productItems = await this._productItemRepository.find({
        where: { locationId: location.id },
        relations: ['productVariant'],
        order: { createdAt: 'DESC' },
      });

      const variants: ProductVariant[] = [];
      productItems.forEach((productItem) => {
        if (
          !variants.some(
            (variant) => variant.id === productItem.productVariantId,
          )
        ) {
          variants.push(productItem.productVariant);
        }
      });

      const variantsProductItemsOutputModel: VariantProductItemsOutputModel[] =
        [];

      await Promise.all(
        variants.map(async (variant) => {
          const productVariant = await this._productVariantRepository.findOne({
            where: { id: variant.id },
            relations: ['product', 'attributeValues'],
          });
          const productItems = await this._productItemRepository.find({
            where: { productVariantId: variant.id, locationId: location.id },
            relations: ['location', 'supplier', 'productVariant'],
          });

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(productVariant);

          variantsProductItemsOutputModel.push({
            variant: variantDetails,
            productItems,
          });
        }),
      );

      return new GetLocationProductItemsOutput(
        variantsProductItemsOutputModel.map(
          (variantModel) => new VariantProductItemsOutput(variantModel, lang),
        ),
        productItems.length,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetLocationProductItemsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetLocationProductItemsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const location = await this._locationRepository.findOne({
        where: {
          id: input.locationId,
        },
      });
      if (!location) {
        throw new NotFoundException(`Location not found`);
      }

      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      return { location, lang };
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationProductItemsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
