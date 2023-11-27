import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AddressUsage,
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationDto,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import {
  GetAddressesOptionsInput,
  MiniAddressOutput,
} from 'src/domain/dto/shared';
import { Address } from 'src/domain/entities/shared';
import { AddressRepository } from 'src/repositories/shared';
import { GetAddressesInput, GetAddressesOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  usage?: AddressUsage;
};

@Injectable()
export class GetAddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
  ) {}

  async getAddresses(
    input: GetAddressesInput,
    user: UserCon,
  ): Promise<GetAddressesOutput> {
    const { pagination, options } = input;
    const result = await this._tryValidation(user, pagination, options);

    if (!result) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetAddressesOutput = await this._tryExecution(
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
  ): Promise<GetAddressesOutput> {
    try {
      const { pageIndex, pageSize, lang, usage } = result;

      let skip: number;
      let take: number;
      if (pageIndex && pageSize) {
        skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
        take = pageSize || DEFAULT_PAGE_SIZE;
      }

      const addresses = await this._addressRepository.find({
        where: { usage },
        skip,
        take,
      });

      const allAddresses = await this._addressRepository.find({
        where: { usage },
      });

      return new GetAddressesOutput(
        addresses.map((address) => new MiniAddressOutput(address)),
        allAddresses.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetAddressesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    user: UserCon,
    pagination?: PaginationInput,
    options?: GetAddressesOptionsInput,
  ): Promise<ValidationResult> {
    try {
      pagination.lang = pagination.lang
        ? pagination.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (!ISOLang[pagination.lang.toUpperCase()]) {
        throw new HttpException(
          `Invalid language input: ${pagination.lang} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      let pageIndex = pagination.pageIndex ? pagination.pageIndex : null;
      let pageSize = pagination.pageSize ? pagination.pageSize : null;

      if (pageIndex) {
        pageIndex = parseInt(pageIndex.toString());
        pageSize = pageSize ? parseInt(pageSize.toString()) : DEFAULT_PAGE_SIZE;

        if (Number.isNaN(pageIndex) || pageIndex <= 0) {
          throw new HttpException(
            `Invalid fields: pageIndex ${pageIndex}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (Number.isNaN(pageSize) || pageSize < 0) {
          throw new HttpException(
            `Invalid fields: pageSize ${pageSize}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return {
        pageIndex,
        pageSize,
        lang: pagination.lang,
        usage: options.usage ? options.usage : AddressUsage.WAREHOUSES_USAGE,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetAddressesService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
