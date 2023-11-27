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
import { MiniAttributeOutput } from 'src/domain/dto/items/eav';
import { Attribute, AttributeValue, Unit } from 'src/domain/entities/items/eav';
import {
  AttributeRepository,
  AttributeValueRepository,
  UnitRepository,
} from 'src/repositories/items';
import { GetDeletedAttributesInput, GetDeletedAttributesOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetDeletedAttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async getDeletedAttributes(
    input: GetDeletedAttributesInput,
    user: UserCon,
  ): Promise<GetDeletedAttributesOutput> {
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
  ): Promise<GetDeletedAttributesOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const attributes = await this._attributeRepository.find({
        relations: ['units', 'definedAttributeValues'],
        withDeleted: true,
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      const outputs = attributes.filter(
        (attribute) => attribute.deletedAt !== null,
      );

      await Promise.all(
        outputs?.map(async (attribute) => {
          const attributeValues = await this._attributeValueRepository.find({
            where: { attributeId: attribute.id },
            withDeleted: true,
          });

          await Promise.all(
            attributeValues.map(async (attributeValue) => {
              if (!isNullOrWhiteSpace(attributeValue.unitId)) {
                attributeValue.unit = await this._unitRepository.findOne(
                  attributeValue.unitId,
                );
              }

              return attributeValue;
            }),
          );

          attribute.definedAttributeValues.push(...attributeValues);
        }),
      );

      const allAttributes = await this._attributeRepository.find({
        withDeleted: true,
      });

      const totalOutputs = allAttributes.filter(
        (attr) => attr.deletedAt !== null,
      );

      return new GetDeletedAttributesOutput(
        outputs.map((output) => new MiniAttributeOutput(output, lang)),
        totalOutputs.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetDeletedAttributesService.name} - ${this._tryExecution.name}`,
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
        `${GetDeletedAttributesService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
