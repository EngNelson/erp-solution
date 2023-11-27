import {
  AgentRoles,
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationInput,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'src/domain/entities/finance';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { CounterRepository } from 'src/repositories/finance';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetCountersInput, GetCountersOutput } from './dto';
import {
  CounterItemOutput,
  GetCountersOptionsDto,
} from 'src/domain/dto/finance/counter';
import { Like } from 'typeorm';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  reference?: string;
  cashierId?: string;
  storagePointId?: string;
};

type WhereClause = {
  reference?: string;
  cashierId?: string;
  storagePointId?: string;
};

@Injectable()
export class GetCountersService {
  constructor(
    @InjectRepository(Counter)
    private readonly _counterRepository: CounterRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getCounters(
    input: GetCountersInput,
    user: UserCon,
  ): Promise<GetCountersOutput> {
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
  ): Promise<GetCountersOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        reference,
        cashierId,
        storagePointId,
      } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};
      if (cashierId) whereClause.cashierId = cashierId;
      if (storagePointId) whereClause.storagePointId = storagePointId;

      let counters: Counter[] = [];
      let allCounters: [Counter[], number] = [[], 0];

      if (reference) {
        counters = await this._counterRepository.find({
          where: {
            reference: Like(`%${reference}%`),
            ...whereClause,
          },
          relations: ['storagePoint'],
          order: { createdAt: 'DESC' },
          skip,
          take,
        });

        allCounters = await this._counterRepository.findAndCount({
          where: {
            reference: Like(`%${reference}%`),
            ...whereClause,
          },
        });
      } else {
        counters = await this._counterRepository.find({
          where: {
            ...whereClause,
          },
          relations: ['storagePoint'],
          order: { createdAt: 'DESC' },
          skip,
          take,
        });

        allCounters = await this._counterRepository.findAndCount({
          where: {
            ...whereClause,
          },
        });
      }

      return new GetCountersOutput(
        counters.map((counter) => new CounterItemOutput(counter)),
        allCounters[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetCountersService.name} - ${this._tryExecution.name} - `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetCountersOptionsDto,
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

      if (
        options.storagePointId &&
        !isNullOrWhiteSpace(options.storagePointId)
      ) {
        const storagePoint = await this._storagePointRepository.findOne(
          options.storagePointId,
        );
        if (!storagePoint) {
          throw new NotFoundException(
            `The target storage point ${options.storagePointId} is not found`,
          );
        }
      }

      if (
        user.roles.some((role) => role === AgentRoles.TREASURY) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.ACCOUNTING ||
            role === AgentRoles.DAF ||
            role === AgentRoles.DG,
        )
      ) {
        options.cashierId = user.id;
      }

      return { ...pagination, ...options };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetCountersService.name} - ${this._tryValidation.name} - `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
