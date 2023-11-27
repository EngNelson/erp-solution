import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  isNullOrWhiteSpace,
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import { AttributeSetItemOutput } from 'src/domain/dto/items/eav';
import { Attribute, AttributeSet, Unit } from 'src/domain/entities/items/eav';
import {
  AttributeRepository,
  AttributeSetRepository,
  UnitRepository,
} from 'src/repositories/items';
import { GetAttributeSetsInput, GetAttributeSetsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetAttributeSetsService {
  constructor(
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async getAttributeSets(
    input: GetAttributeSetsInput,
    user: UserCon,
  ): Promise<GetAttributeSetsOutput> {
    const { pagination } = input;
    const validationResult = await this._tryValidation(pagination, user);

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
  ): Promise<GetAttributeSetsOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const attributeSets = await this._attributeSetRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['options'],
        skip,
        take,
      });

      const allAttributeSets =
        await this._attributeSetRepository.findAndCount();

      await Promise.all(
        attributeSets.map(async (attributeSet) => {
          await Promise.all(
            attributeSet.options?.map(async (option) => {
              option.attribute = await this._attributeRepository.findOneOrFail(
                option.attributeId,
                { relations: ['units', 'definedAttributeValues'] },
              );

              await Promise.all(
                option.attribute.definedAttributeValues.map(
                  async (definedValue) => {
                    if (!isNullOrWhiteSpace(definedValue.unitId)) {
                      definedValue.unit =
                        await this._unitRepository.findOneOrFail(
                          definedValue.unitId,
                        );
                    }

                    return definedValue;
                  },
                ),
              );

              return option;
            }),
          );

          return attributeSet;
        }),
      );

      // console.log(attributeSets);

      return new GetAttributeSetsOutput(
        attributeSets.map(
          (attributeSet) =>
            new AttributeSetItemOutput(
              attributeSet,
              lang,
              attributeSet.options,
            ),
        ),
        allAttributeSets[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      // console.log(error);

      throw new BadRequestException(
        `${GetAttributeSetsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : DEFAULT_PAGE_INDEX;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : DEFAULT_PAGE_SIZE;

      pagination.lang = pagination.lang
        ? pagination.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (Number.isNaN(pagination.pageIndex) || pagination.pageIndex <= 0) {
        throw new HttpException(
          `Invalid fields: pageIndex ${pagination.pageIndex}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (Number.isNaN(pagination.pageSize) || pagination?.pageSize < 0) {
        throw new HttpException(
          `Invalid fields: pageSize ${pagination.pageSize}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ISOLang[pagination.lang.toUpperCase()]) {
        throw new HttpException(
          `Invalid language input: ${pagination.lang} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return { ...pagination };
    } catch (error) {
      throw new BadRequestException(
        `${GetAttributeSetsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
