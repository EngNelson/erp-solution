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
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import { AttributeItemOutput } from 'src/domain/dto/items/eav';
import { Attribute } from 'src/domain/entities/items/eav';
import { AttributeRepository } from 'src/repositories/items';
import { GetAttributesInput, GetAttributesOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetAttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
  ) {}

  async getAttributes(
    input: GetAttributesInput,
    user: UserCon,
  ): Promise<GetAttributesOutput> {
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
  ): Promise<GetAttributesOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const attributes = await this._attributeRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['units', 'definedAttributeValues'],
        skip,
        take,
      });

      // await Promise.all(
      //   attributes.map(async (attribute) => {
      //     await Promise.all(
      //       attribute.definedAttributeValues?.map(
      //         async (definedAttributeValue) => {
      //           if (!isNullOrWhiteSpace(definedAttributeValue.unitId)) {
      //             definedAttributeValue.unit =
      //               await this._unitRepository.findOne(
      //                 definedAttributeValue.unitId,
      //               );
      //           }

      //           return definedAttributeValue;
      //         },
      //       ),
      //     );

      //     return attribute;
      //   }),
      // );

      const allAttributes = await this._attributeRepository.findAndCount();

      return new GetAttributesOutput(
        attributes.map((attribute) => new AttributeItemOutput(attribute, lang)),
        allAttributes[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetAttributesService.name} - ${this._tryExecution.name}`,
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
        `${GetAttributesService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
