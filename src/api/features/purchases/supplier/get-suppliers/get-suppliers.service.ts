import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupplierItemOutput } from 'src/domain/dto/purchases';
import { Supplier } from 'src/domain/entities/purchases';
import { SupplierRepository } from 'src/repositories/purchases';
import { GetSuppliersInput, GetSuppliersOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetSuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
  ) {}

  async getSuppliers(
    input: GetSuppliersInput,
    user: UserCon,
  ): Promise<GetSuppliersOutput> {
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
  ): Promise<GetSuppliersOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const suppliers = await this._supplierRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['address'],
        take,
        skip,
      });

      const [allSuppliers, count] =
        await this._supplierRepository.findAndCount();

      return new GetSuppliersOutput(
        suppliers.map((supplier) => new SupplierItemOutput(supplier)),
        count,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetSuppliersService.name} - ${this._tryExecution.name}`,
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
      console.log(error);
      throw new BadRequestException(
        `${GetSuppliersService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
