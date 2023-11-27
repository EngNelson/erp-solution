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
  GetTransfertsOptionsDto,
  MiniTransfertOutput,
} from 'src/domain/dto/flows';
import { Transfert } from 'src/domain/entities/flows';
import { TransfertStatus, TransfertType } from 'src/domain/enums/flows';
import { TransfertRepository } from 'src/repositories/flows';
import { GetTransfertsInput, GetTransfertsOutput } from './dto';
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
  status?: TransfertStatus;
  type?: TransfertType;
  storagePointId?: string;
  targetId?: string;
  sourceId?: string;
  reference?: string;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
  orderId?: string;
  ordersId?: string[];
};

type WhereClause = {
  parent: string | null;
  status?: FindOperator<TransfertStatus> | TransfertStatus;
  type?: TransfertType;
  orderId?: FindOperator<string> | string;
  targetId?: string;
  sourceId?: string;
};

@Injectable()
export class GetTransfertsService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
  ) {}

  async getTransferts(
    input: GetTransfertsInput,
    user: UserCon,
  ): Promise<GetTransfertsOutput> {
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
  ): Promise<GetTransfertsOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        status,
        type,
        targetId,
        sourceId,
        startDate,
        endDate,
        specificDate,
        orderId,
        ordersId,
      } = result;

      let reference = result.reference;
      let storagePointId = result.storagePointId;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {
        parent: null,
        status: In([
          TransfertStatus.PENDING,
          TransfertStatus.CONFIRMED,
          TransfertStatus.AWAITING_PURCHASE,
        ]),
      };
      if (status) whereClause.status = status;
      if (type) whereClause.type = type;
      if (orderId) whereClause.orderId = orderId;
      if (ordersId && ordersId.length > 0) {
        whereClause.orderId = In(ordersId);
        reference = undefined;
        delete whereClause.status;
      }
      if (targetId) {
        whereClause.targetId = targetId;
        storagePointId = undefined;
      }
      if (sourceId) {
        whereClause.sourceId = sourceId;
        storagePointId = undefined;
      }

      if (reference) delete whereClause.status;

      console.log('Where clause === ', whereClause);

      let transferts: Transfert[] = [];
      let allTransferts: [Transfert[], number] = [[], 0];

      if (startDate && endDate) {
        if (storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: [
              'source',
              'target',
              'order',
              'purchaseOrder',
              'purchaseOrder',
            ],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (storagePointId && !reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: Between(startDate, endDate),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: [
              'source',
              'target',
              'order',
              'purchaseOrder',
              'purchaseOrder',
            ],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: Between(startDate, endDate),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Between(startDate, endDate),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (!storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: [
              'source',
              'target',
              'order',
              'purchaseOrder',
              'purchaseOrder',
            ],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else {
          console.log('WE ARE HERE');

          transferts = await this._transfertRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
            relations: [
              'source',
              'target',
              'order',
              'purchaseOrder',
              'purchaseOrder',
            ],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
          });
        }
      } else if (startDate && !endDate) {
        if (storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: [
              'source',
              'target',
              'order',
              'purchaseOrder',
              'purchaseOrder',
            ],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (storagePointId && !reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: MoreThanOrEqual(startDate),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: MoreThanOrEqual(startDate),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (!storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
          });
        }
      } else if (!startDate && endDate) {
        if (storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (storagePointId && !reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: LessThanOrEqual(endDate),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: LessThanOrEqual(endDate),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (!storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
          });
        }
      } else if (specificDate) {
        if (storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (storagePointId && !reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                createdAt: Like(`${specificDate}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                createdAt: Like(`${specificDate}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (!storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else {
          transferts = await this._transfertRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              createdAt: Like(`${specificDate}%`),
              ...whereClause,
            },
          });
        }
      } else {
        if (storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                reference: Like(`%${reference}%`),
                targetId: storagePointId,
                ...whereClause,
              },
              {
                reference: Like(`%${reference}%`),
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (storagePointId && !reference) {
          transferts = await this._transfertRepository.find({
            where: [
              {
                targetId: storagePointId,
                ...whereClause,
              },
              {
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: [
              {
                targetId: storagePointId,
                ...whereClause,
              },
              {
                sourceId: storagePointId,
                ...whereClause,
              },
            ],
          });
        } else if (!storagePointId && reference) {
          transferts = await this._transfertRepository.find({
            where: {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          });
        } else {
          transferts = await this._transfertRepository.find({
            where: whereClause,
            relations: ['source', 'target', 'order', 'purchaseOrder'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allTransferts = await this._transfertRepository.findAndCount({
            where: whereClause,
          });
        }
      }

      return new GetTransfertsOutput(
        transferts.map((transfert) => new MiniTransfertOutput(transfert, lang)),
        allTransferts[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetTransfertsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetTransfertsOptionsDto,
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

      let orderId: string;

      if (options.orderRef && !isNullOrWhiteSpace(options.orderRef)) {
        const order = await this._orderRepository.findOne({
          where: { reference: options.orderRef },
        });
        if (order) orderId = order.id;
      }

      const ordersId: string[] = [];

      if (options.reference && !isNullOrWhiteSpace(options.reference)) {
        const transferts = await this._transfertRepository.find({
          where: { reference: Like(`%${options.reference}%`) },
        });
        if (!transferts || transferts.length === 0) {
          const orders = await this._orderRepository.find({
            where: { reference: Like(`%${options.reference}%`) },
          });
          if (orders && orders.length > 0) {
            orders.forEach((order) => ordersId.push(order.id));
          }
        }
      }

      return { ...pagination, ...options, orderId, ordersId };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetTransfertsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
