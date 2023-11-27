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
import {
  GetOtherOutputsOptionsDto,
  MiniOtherOutputOutput,
} from 'src/domain/dto/flows';
import { OtherOutput } from 'src/domain/entities/flows';
import { OtherOutputRepository } from 'src/repositories/flows';
import { GetOtherOutputsInput, GetOtherOutputsOutput } from './dto';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OutputStatus, OutputType } from 'src/domain/enums/flows';
import { Between, In, LessThanOrEqual, Like, MoreThanOrEqual } from 'typeorm';
import { StoragePointRepository } from 'src/repositories/warehouses';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  user: UserCon;
  storagePoints?: StoragePoint[];
  outputType?: OutputType;
  status?: OutputStatus;
  reference?: string;
  orderRef?: string;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
};

type WhereClause = {
  outputType?: OutputType;
  status?: OutputStatus;
  magentoOrderID?: string;
};

@Injectable()
export class GetOtherOutputsService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getOtherOutputs(
    input: GetOtherOutputsInput,
    user: UserCon,
  ): Promise<GetOtherOutputsOutput> {
    const { pagination, options } = input;
    const validationResult = await this._tryValidation(
      pagination,
      user,
      options,
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
  ): Promise<GetOtherOutputsOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        user,
        storagePoints,
        outputType,
        status,
        reference,
        orderRef,
        startDate,
        endDate,
        specificDate,
      } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};
      if (outputType) whereClause.outputType = outputType;
      if (status) whereClause.status = status;
      if (orderRef) whereClause.magentoOrderID = orderRef;

      const storagePointIds: string[] = [];

      if (storagePoints.length > 0) {
        storagePoints.forEach((storagePoint) =>
          storagePointIds.push(storagePoint.id),
        );
      }

      let otherOutputs: OtherOutput[] = [];
      let allOtherOutputs: [OtherOutput[], number] = [[], 0];

      if (startDate && endDate) {
        if (reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: Between(startDate, endDate),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: Between(startDate, endDate),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
          });
        } else if (reference && storagePointIds.length === 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: Between(startDate, endDate),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: Between(startDate, endDate),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                ...whereClause,
              },
            ],
          });
        } else {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
          });
        }
      } else if (startDate && !endDate) {
        if (reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
          });
        } else if (reference && storagePointIds.length === 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                ...whereClause,
              },
            ],
          });
        } else {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
          });
        }
      } else if (!startDate && endDate) {
        if (reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
          });
        } else if (reference && storagePointIds.length === 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                ...whereClause,
              },
            ],
          });
        } else {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
          });
        }
      } else if (specificDate) {
        if (reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
          });
        } else if (reference && storagePointIds.length === 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                ...whereClause,
              },
            ],
          });
        } else {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              ...whereClause,
            },
          });
        }
      } else {
        if (reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                storagePointId: In(storagePointIds),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              {
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            ],
          });
        } else if (reference && storagePointIds.length === 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          otherOutputs = await this._otherOutputRepository.find({
            where: [
              {
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                ...whereClause,
              },
            ],
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: [
              {
                storagePointId: In(storagePointIds),
                ...whereClause,
              },
              {
                ...whereClause,
              },
            ],
          });
        } else {
          otherOutputs = await this._otherOutputRepository.find({
            where: whereClause,
            relations: ['storagePoint'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allOtherOutputs = await this._otherOutputRepository.findAndCount({
            where: whereClause,
          });
        }
      }

      return new GetOtherOutputsOutput(
        otherOutputs.map(
          (otherOutput) => new MiniOtherOutputOutput(otherOutput),
        ),
        allOtherOutputs[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetOtherOutputsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options: GetOtherOutputsOptionsDto,
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

      let storagePoints: StoragePoint[] = [];

      if (
        options.storagePointName &&
        !isNullOrWhiteSpace(options.storagePointName)
      ) {
        storagePoints = await this._storagePointRepository.find({
          where: { name: Like(`%${options.storagePointName}%`) },
        });
      }

      return {
        ...pagination,
        user,
        storagePoints,
        outputType: options.outputType,
        status: options.status,
        reference: options.reference,
        orderRef: options.orderRef,
        startDate: options.startDate,
        endDate: options.endDate,
        specificDate: options.specificDate,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOtherOutputsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
