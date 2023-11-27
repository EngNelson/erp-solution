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
import { AttributeSetItemOutput } from 'src/domain/dto/items/eav';
import {
  Product,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
} from 'src/domain/entities/items/eav';
import { AttributeOptionModel } from 'src/domain/types/catalog/eav';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeSetRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { EditAttributeSetInput } from './dto';

type ValidationResult = {
  attributeSet: AttributeSet;
  attributeOptionsToAdd: AttributeOptionModel[];
  attributeOptionsToUpdate: AttributeOptionModel[];
  attributeOptionsToDelete: string[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditAttributeSetService {
  constructor(
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
  ) {}

  async editAttributeSet(
    input: EditAttributeSetInput,
    user: UserCon,
  ): Promise<AttributeSetItemOutput> {
    const result = await this._tryValidation(input, user);

    if (!result) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, result);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditAttributeSetInput,
    result: ValidationResult,
  ): Promise<AttributeSetItemOutput> {
    try {
      const {
        attributeSet,
        attributeOptionsToAdd,
        attributeOptionsToUpdate,
        attributeOptionsToDelete,
        lang,
        user,
      } = result;
      const { title, description, ...datas } = input;

      if (title) {
        attributeSet.title = title;
      }

      if (description) {
        if (!attributeSet.description) {
          attributeSet.description = description;
        } else {
          const inputLangs = Object.keys(description);
          inputLangs.forEach(
            (l) => (attributeSet.description[l] = description[l]),
          );
        }
      }

      await this._attributeSetRepository.save(attributeSet);

      const optionsToAdd: AttributeOption[] = [];
      const optionsToUpdate: AttributeOption[] = [];
      const optionsToDelete: AttributeOption[] = [];

      if (attributeOptionsToAdd && attributeOptionsToAdd.length > 0) {
        attributeOptionsToAdd.map((attrOption) => {
          const optionToAdd = new AttributeOption();

          optionToAdd.attribute = attrOption.attribute;
          optionToAdd.attributeId = attrOption.attribute.id;

          optionToAdd.required = attrOption.required;
          optionToAdd.attributeSet = attributeSet;
          optionToAdd.attributeSetId = attributeSet.id;

          optionToAdd.createdBy = user;

          optionsToAdd.push(optionToAdd);
        });

        await this._attributeOptionRepository.save(optionsToAdd);
      }

      if (attributeOptionsToUpdate && attributeOptionsToUpdate.length > 0) {
        attributeOptionsToUpdate.map((attrOption) => {
          attrOption.attributeOption.attribute = attrOption.attribute;
          attrOption.attributeOption.attributeId = attrOption.attribute.id;

          attrOption.attributeOption.attributeSet = attributeSet;
          attrOption.attributeOption.attributeSetId = attributeSet.id;

          attrOption.attributeOption.required = attrOption.required;

          optionsToUpdate.push(attrOption.attributeOption);
        });

        await this._attributeOptionRepository.save(optionsToUpdate);
      }

      if (attributeOptionsToDelete && attributeOptionsToDelete.length > 0) {
        await Promise.all(
          attributeOptionsToDelete.map(async (optionId) => {
            const attributeOptionToDelete =
              await this._attributeOptionRepository.findOne(optionId);
            optionsToDelete.push(attributeOptionToDelete);
          }),
        );

        this._attributeOptionRepository.delete(attributeOptionsToDelete);

        this._attributeOptionRepository.save(optionsToDelete);
      }

      const attributeOptions = optionsToUpdate.concat(optionsToAdd);

      attributeSet.options = attributeOptions;

      attributeSet.updatedBy = user;

      await this._attributeSetRepository.save(attributeSet);

      return new AttributeSetItemOutput(attributeSet, lang, attributeOptions);
    } catch (error) {
      throw new ConflictException(
        `${EditAttributeSetService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditAttributeSetInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const attributeSet = await this._attributeSetRepository.findOne(
        input.attributeSetId,
        { relations: ['options'] },
      );
      if (!attributeSet) {
        throw new NotFoundException(`Attribute set to edit not found`);
      }

      /**
       * Attribute options validation
       */
      const attributeOptionsToAdd: AttributeOptionModel[] = [];
      const attributeOptionsToUpdate: AttributeOptionModel[] = [];
      const attributeOptionsToDelete: string[] = [];
      const optionsToDelete: AttributeOption[] = [];

      await Promise.all(
        input.attributeOptions.map(async (inputAttributeOption) => {
          const { attributeOptionId, attributeId, required } =
            inputAttributeOption;

          const attribute = await this._attributeRepository.findOne(
            attributeId,
            { relations: ['units', 'definedAttributeValues'] },
          );
          if (!attribute) {
            throw new NotFoundException(
              `Attribute with id ${attributeId} not found`,
            );
          }

          /**
           * attribute options to update
           */
          if (!isNullOrWhiteSpace(attributeOptionId)) {
            const attributeOption =
              await this._attributeOptionRepository.findOne(attributeOptionId, {
                relations: ['attributeSet', 'attribute'],
              });
            if (!attributeOption) {
              throw new NotFoundException(
                `Some attribute options are not found`,
              );
            }

            if (
              !attributeOptionsToUpdate.find(
                (attributeOptionToUpdate) =>
                  attributeOptionToUpdate.attribute.id === attribute.id,
              )
            ) {
              attributeOptionsToUpdate.push({
                attributeOption,
                attribute,
                required,
              });
            }
          }

          /**
           * attribute options to add
           */
          if (isNullOrWhiteSpace(attributeOptionId)) {
            if (
              !attributeOptionsToAdd.find(
                (attributeOptionToAdd) =>
                  attributeOptionToAdd.attribute.id === attribute.id,
              )
            ) {
              attributeOptionsToAdd.push({ attribute, required });
            }
          }
        }),
      );

      /**
       * attribute options to delete
       */
      attributeSet.options.map((option) => {
        if (
          input.attributeOptions.filter(
            (inputOption) => inputOption.attributeOptionId === option.id,
          ).length === 0
        ) {
          attributeOptionsToDelete.push(option.id);
          optionsToDelete.push(option);
        }
      });

      /**
       * Check if attribute option to delete is not used
       */
      const products = await this._productRepository.find({
        attributeSetId: attributeSet.id,
      });
      const variantsAttributeValues: ProductVariantAttributeValues<any>[] = [];

      await Promise.all(
        products?.map(async (product) => {
          const variants = await this._productVariantRepository.find({
            where: { productId: product.id },
            relations: ['attributeValues'],
          });

          variants?.map((variant) =>
            variantsAttributeValues.push(...variant.attributeValues),
          );
        }),
      );

      const errors: string[] = [];

      optionsToDelete?.map((optionToDelete) => {
        if (
          variantsAttributeValues?.some(
            (variantAttributeValue) =>
              variantAttributeValue.attributeId === optionToDelete.attributeId,
          )
        ) {
          errors.push(
            `Cannot remove attribute already in used by some products`,
          );
        }
      });

      if (errors.length > 0) {
        throw new BadRequestException(`${errors[0]}`);
      }

      // console.log(
      //   `to add : ${attributeOptionsToAdd.length}`,
      //   attributeOptionsToAdd,
      // );
      // console.log(
      //   `to edit : ${attributeOptionsToUpdate.length}`,
      //   attributeOptionsToUpdate,
      // );
      // console.log(
      //   `to delete : ${attributeOptionsToDelete.length}`,
      //   attributeOptionsToDelete,
      // );

      return {
        attributeSet,
        attributeOptionsToAdd,
        attributeOptionsToUpdate,
        attributeOptionsToDelete,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditAttributeSetService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
