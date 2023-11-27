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
  GetReceptionsOptionsDto,
  MiniReceptionWithOrderOutput,
} from 'src/domain/dto/flows';
import { Reception } from 'src/domain/entities/flows';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';
import { ReceptionRepository } from 'src/repositories/flows';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetReceptionsInput, GetReceptionsOutput } from './dto';
import {
  Between,
  FindOperator,
  In,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
} from 'typeorm';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  storagePoints?: StoragePoint[];
  type?: ReceptionType;
  status?: OperationStatus;
  reference?: string;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
  orderId?: string;
  ordersId?: string[];
};

type WhereClause = {
  type?: ReceptionType;
  status?: OperationStatus;
  orderId?: FindOperator<string> | string;
};

@Injectable()
export class GetReceptionsService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
  ) {}

  async getReceptions(
    input: GetReceptionsInput,
    user: UserCon,
  ): Promise<GetReceptionsOutput> {
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
  ): Promise<GetReceptionsOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        storagePoints,
        type,
        status,
        startDate,
        endDate,
        specificDate,
        orderId,
        ordersId,
      } = result;

      let reference = result.reference;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};
      if (type) whereClause.type = type;
      if (status) whereClause.status = status;
      if (orderId) whereClause.orderId = orderId;
      if (ordersId && ordersId.length > 0) {
        whereClause.orderId = In(ordersId);
        reference = undefined;
      }

      console.log('Where clause === ', whereClause);

      const storagePointIds: string[] = [];

      if (storagePoints.length > 0) {
        storagePoints.forEach((storagePoint) =>
          storagePointIds.push(storagePoint.id),
        );
      }

      let receptions: Reception[] = [];
      let allReceptions: [Reception[], number] = [[], 0];

      if (startDate && endDate) {
        if (reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (reference && storagePointIds.length === 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
          });
        } else {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
          });
        }
      } else if (startDate && !endDate) {
        if (reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (reference && storagePointIds.length === 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
          });
        } else {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
          });
        }
      } else if (!startDate && endDate) {
        if (reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (reference && storagePointIds.length === 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
          });
        } else {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
          });
        }
      } else if (specificDate) {
        if (reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (reference && storagePointIds.length === 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
          });
        } else {
          receptions = await this._receptionRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              ...whereClause,
            },
          });
        }
      } else {
        if (reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              storagePointId: In(storagePointIds),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (reference && storagePointIds.length === 0) {
          receptions = await this._receptionRepository.find({
            where: {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else if (!reference && storagePointIds.length > 0) {
          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: {
              storagePointId: In(storagePointIds),
              ...whereClause,
            },
          });
        } else {
          receptions = await this._receptionRepository.find({
            where: whereClause,
            relations: ['storagePoint', 'order'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allReceptions = await this._receptionRepository.findAndCount({
            where: whereClause,
          });
        }
      }

      // await Promise.all(
      //   receptions.map(async (reception) => {
      //     if (reception.child) {
      //       reception.child = await this._receptionRepository.findOne(
      //         reception.child.id,
      //         { relations: ['storagePoint',  'order'] },
      //       );
      //     }

      //     return reception;
      //   }),
      // );

      return new GetReceptionsOutput(
        receptions.map(
          (reception) => new MiniReceptionWithOrderOutput(reception),
        ),
        allReceptions[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetReceptionsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetReceptionsOptionsDto,
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

      let orderId: string;

      if (options.orderRef && !isNullOrWhiteSpace(options.orderRef)) {
        const order = await this._orderRepository.findOne({
          where: { reference: options.orderRef },
        });
        if (order) orderId = order.id;
      }

      const ordersId: string[] = [];

      if (options.reference && !isNullOrWhiteSpace(options.reference)) {
        const receptions = await this._receptionRepository.find({
          where: { reference: Like(`%${options.reference}%`) },
        });
        if (!receptions || receptions.length === 0) {
          const orders = await this._orderRepository.find({
            where: { reference: Like(`%${options.reference}%`) },
          });
          if (orders && orders.length > 0) {
            orders.forEach((order) => ordersId.push(order.id));
          }
        }
      }

      return {
        ...pagination,
        storagePoints,
        ...options,
        orderId,
        ordersId,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetReceptionsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
