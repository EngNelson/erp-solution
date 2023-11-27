import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  isNullOrWhiteSpace,
  ISOLang,
  PaginationInput,
  StoragePointType,
  UserCon,
} from '@glosuite/shared';
import {
  GetStoragePointsOptionsDto,
  StoragePointItemOutput,
} from 'src/domain/dto/warehouses';
import { Address } from 'src/domain/entities/shared';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { AddressRepository } from 'src/repositories/shared';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetStoragePointsInput, GetStoragePointsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  address?: Address;
  storageType?: StoragePointType;
  isAddress?: boolean;
};

type WhereClause = {
  storageType?: StoragePointType;
  addressId?: string;
};

@Injectable()
export class GetStoragePointsService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
  ) {}

  async getStoragePoints(
    input: GetStoragePointsInput,
    user: UserCon,
  ): Promise<GetStoragePointsOutput> {
    const { pagination, options } = input;
    const validationResult = await this._tryValidation(
      pagination,
      options,
      user,
    );

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
  ): Promise<GetStoragePointsOutput> {
    try {
      const { pageIndex, pageSize, lang, address, storageType, isAddress } =
        result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};

      if (storageType) {
        whereClause.storageType = storageType;
      }

      if (isAddress) {
        whereClause.addressId = address.id;
      }

      const storagePoints = await this._storagePointRepository.find({
        where: whereClause,
        relations: ['address'],
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      const allStoragePoints = await this._storagePointRepository.findAndCount({
        where: whereClause,
      });

      return new GetStoragePointsOutput(
        storagePoints.map(
          (storagePoint) => new StoragePointItemOutput(storagePoint, lang),
        ),
        allStoragePoints[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    options: GetStoragePointsOptionsDto,
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

      const { storageType, addressId } = options;
      let address: Address;

      if (addressId && !isNullOrWhiteSpace(addressId)) {
        address = await this._addressRepository.findOne({
          where: { id: addressId },
        });
        if (!address) {
          throw new NotFoundException(
            `Address with id '${addressId}' not found`,
          );
        }
      }

      return {
        ...pagination,
        address,
        storageType,
        isAddress: !!address,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
