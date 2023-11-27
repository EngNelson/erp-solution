import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
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
import { Like } from 'typeorm';
import { SearchSuppliersByNameInput, SearchSuppliersByNameOutput } from './dto';

@Injectable()
export class SearchSuppliersByNameService {
  constructor(
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
  ) {}

  async searchSuppliersByName(
    input: SearchSuppliersByNameInput,
    user: UserCon,
  ): Promise<SearchSuppliersByNameOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: SearchSuppliersByNameInput,
    user: UserCon,
  ): Promise<SearchSuppliersByNameOutput> {
    try {
      const { keyword, pagination } = input;

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

      const { pageIndex, pageSize, lang } = pagination;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const suppliers = await this._supplierRepository.find({
        where: { name: Like(`%${keyword}%`) },
        order: { createdAt: 'DESC' },
        relations: ['address'],
        take,
        skip,
      });

      const allSuppliers = await this._supplierRepository.find({
        where: { name: Like(`%${keyword}%`) },
      });

      return new SearchSuppliersByNameOutput(
        suppliers.map((supplier) => new SupplierItemOutput(supplier)),
        allSuppliers.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${SearchSuppliersByNameService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
