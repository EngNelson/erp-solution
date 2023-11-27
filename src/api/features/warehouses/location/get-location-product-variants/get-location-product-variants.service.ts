import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { ProductVariant } from 'src/domain/entities/items';
import { Location } from 'src/domain/entities/warehouses';
import { ProductVariantRepository } from 'src/repositories/items';
import { LocationRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities/shared.service';
import {
  GetLocationProductVariantsInput,
  GetLocationProductVariantsOutput,
} from './dto';

type ValidationResult = {
  location: Location;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetLocationProductVariantsService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getLocationProductVariants(
    input: GetLocationProductVariantsInput,
    user: UserCon,
  ): Promise<GetLocationProductVariantsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetLocationProductVariantsOutput =
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
  ): Promise<GetLocationProductVariantsOutput> {
    try {
      const { location, lang, user } = result;

      const variants: ProductVariant[] = [];

      await Promise.all(
        location?.productItems?.map(async (item) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: item.productVariantId },
            relations: ['product', 'attributeValues'],
          });

          if (
            !variants.some((variantPushed) => variantPushed.id === variant.id)
          ) {
            variants.push(variant);
          }
        }),
      );

      const outputs = await this._sharedService.buildVariantsOutput(
        variants,
        location,
      );

      return new GetLocationProductVariantsOutput(
        outputs.map((output) => new ProductVariantItemOutput(output, lang)),
        outputs.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationProductVariantsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetLocationProductVariantsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const location = await this._locationRepository.findOne({
        where: { id: input.locationId },
        relations: ['productItems'],
      });
      if (!location) {
        throw new NotFoundException(`Location not found`);
      }

      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      return { location, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationProductVariantsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
