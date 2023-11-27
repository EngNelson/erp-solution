import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { Category } from 'src/domain/entities/structures';
import { VariantAttributeValueModel } from 'src/domain/types/catalog/items';
import {
  AttributeRepository,
  ProductRepository,
  ProductVariantRepository,
  UnitRepository,
} from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import { GetProductVariantByIdInput } from './dto';

type ValidationResult = {
  productVariant: ProductVariant;
  product: Product;
  categories: Category[];
  attributeValues: VariantAttributeValueModel<any>[];
  lang: ISOLang;
};

@Injectable()
export class GetProductVariantByIdService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getProductVariantById(
    input: GetProductVariantByIdInput,
    user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    const result = await this._tryValidation(input, user);

    if (!result) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: ProductVariantItemOutput = await this._tryExecution(
      result,
    );

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
  ): Promise<ProductVariantItemOutput> {
    try {
      const { productVariant, product, categories, attributeValues, lang } =
        result;

      attributeValues.map((attributeValue) => {
        const { attribute, value, unit } = attributeValue;
        attributeValue.unit = unit ? unit : attribute.units[0];
        return attributeValue;
      });

      const variantDetails =
        await this._sharedService.buildVariantDetailsOutput(productVariant);

      return new ProductVariantItemOutput(variantDetails, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetProductVariantByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: GetProductVariantByIdInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const productVariant = await this._productVariantRepository.findOne(
        input.id,
        {
          relations: [
            'product',
            'attributeValues',
            'productItems',
            'specialPrice',
          ],
        },
      );
      if (!productVariant) {
        throw new NotFoundException(`Variant with id '${input.id}' not found`);
      }

      /**
       * Load variant categories from product
       */
      const product = await this._productRepository.findOne(
        productVariant.productId,
        { relations: ['categories'] },
      );

      const attributeValues: VariantAttributeValueModel<any>[] = [];

      await Promise.all(
        productVariant.attributeValues.map(async (attrValue) => {
          const value = attrValue.value;
          let unit: Unit;

          if (attrValue.unitId && !isNullOrWhiteSpace(attrValue.unitId)) {
            unit = await this._unitRepository.findOne(attrValue.unitId);

            if (!unit) {
              throw new NotFoundException(
                `Unit with id ${attrValue.unitId} is not found`,
              );
            }
          }

          const attribute = await this._attributeRepository.findOne(
            attrValue.attributeId,
            { relations: ['units'] },
          );

          attributeValues.push({ attribute, value, unit });
        }),
      );

      return {
        productVariant,
        product,
        categories: product.categories,
        attributeValues,
        lang,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetProductVariantByIdService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
