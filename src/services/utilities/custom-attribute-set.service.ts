import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Attribute, AttributeSet } from 'src/domain/entities/items/eav';
import {
  AttributeOptionComparitionModel,
  AttributeSetComparitionOutput,
} from 'src/domain/interfaces/eav';
import { AttributeOptionModel } from 'src/domain/types/catalog/eav';
import {
  AttributeRepository,
  AttributeSetRepository,
} from 'src/repositories/items';

@Injectable()
export class CustomAttributeSetService {
  constructor(
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
  ) {}

  async isAttributeSetExist(
    attributeOptions: AttributeOptionModel[],
    customTitle: string,
  ): Promise<AttributeSetComparitionOutput> {
    try {
      // Is attribute set with title customTitle exist ?
      const attributeSet = await this._attributeSetRepository.findOne({
        where: { title: customTitle },
        relations: ['options'],
      });

      if (attributeSet) {
        /**
         * Check if this attribute set has the same
         * attributeOptions with the new one
         */
        const currentAttributeOptions: AttributeOptionComparitionModel[] = [];
        const newAttributeOptions: AttributeOptionComparitionModel[] = [];

        attributeSet.options.map((option) =>
          currentAttributeOptions.push({
            attributeId: option.attributeId,
            required: option.required,
          }),
        );

        attributeOptions.map((newOption) =>
          newAttributeOptions.push({
            attributeId: newOption.attribute.id,
            required: newOption.required,
          }),
        );

        /**
         * compare attributeOptions and currentAttributeOptions
         */
        const compare = this._compareArrays(
          currentAttributeOptions,
          newAttributeOptions,
        );

        if (compare) {
          return { status: true, attributeSet };
        }
      }

      return { status: false };
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  private _compareArrays(
    firstArray: AttributeOptionComparitionModel[],
    secondArray: AttributeOptionComparitionModel[],
  ): boolean {
    try {
      if (firstArray.length !== secondArray.length) {
        return false;
      }

      if (
        firstArray.some(
          (value) =>
            secondArray.filter(
              (element) =>
                element.attributeId === value.attributeId &&
                element.required === value.required,
            ).length !== 1,
        )
      ) {
        return false;
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }
}
