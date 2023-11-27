import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  isNullOrWhiteSpace,
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import {
  GetPurchaseOrdersOptionsDto,
  MiniPurchaseOrderOutput,
} from 'src/domain/dto/purchases';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { OperationStatus } from 'src/domain/enums/flows';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { GetPurchaseOrdersInput, GetPurchaseOrdersOutput } from './dto';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';
import {
  Between,
  FindOperator,
  In,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { PurchaseType } from 'src/domain/enums/purchases';
import {
  CALAFATAS_WAREHOUSE_REFERENCE,
  DRUOUT_WAREHOUSE_REFERENCE,
  KATIOS_WAREHOUSE_REFERENCE,
  SOUDANAISE_WAREHOUSE_REFERENCE,
} from 'src/domain/constants';
import { Transfert } from 'src/domain/entities/flows';
import { TransfertRepository } from 'src/repositories/flows';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  status?: OperationStatus;
  storagePointId?: string;
  reference?: string;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
  year?: number;
  type?: PurchaseType;
  user: UserCon;
};

type WhereClause = {
  parent: string | null;
  status?: FindOperator<string> | OperationStatus;
  storagePointId?: FindOperator<string> | string;
  type?: PurchaseType;
  assignTo?: string;
};

@Injectable()
export class GetPurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
  ) {}

  async getPurchaseOrders(
    input: GetPurchaseOrdersInput,
    user: UserCon,
  ): Promise<GetPurchaseOrdersOutput> {
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
  ): Promise<GetPurchaseOrdersOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        status,
        storagePointId,
        reference,
        startDate,
        endDate,
        specificDate,
        year,
        type,
        user,
      } = result;

      const yearValue = year ? year.toString() : undefined;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {
        parent: null,
        status: In([OperationStatus.PENDING, OperationStatus.SAVED]),
      };
      if (status) whereClause.status = In([status]);
      if (storagePointId) whereClause.storagePointId = storagePointId;
      if (type) whereClause.type = type;

      if (
        user.roles.find((role) => role === AgentRoles.PROCUREMENT_ASSISTANT)
      ) {
        const warehouseIds = await this._userConFilter(user);
        if (warehouseIds && warehouseIds.length > 0)
          whereClause.storagePointId = In(warehouseIds);
      }

      if (
        user.roles.find((role) => role === AgentRoles.PROCUREMENT_SUPPLY) &&
        !user.roles.find(
          (role) =>
            role === AgentRoles.WAREHOUSE_MANAGER ||
            role === AgentRoles.PROCUREMENT_ASSISTANT,
        )
      ) {
        whereClause.type = PurchaseType.IN_IMPORT;
        delete whereClause.storagePointId;
      }

      let purchaseOrders: PurchaseOrder[] = [];
      let allPurchaseOrders: [PurchaseOrder[], number] = [[], 0];

      let isUserPurchaseAgent = !!(
        user.roles.find((role) => role === AgentRoles.PURCHAGE_AGENT) &&
        !user.roles.find(
          (role) =>
            role === AgentRoles.WAREHOUSE_MANAGER ||
            role === AgentRoles.PROCUREMENT_ASSISTANT ||
            role === AgentRoles.PROCUREMENT_SUPPLY,
        )
      );

      if (isUserPurchaseAgent) {
        whereClause.type = PurchaseType.IN_LOCAL;
        whereClause.assignTo = user.id;
        delete whereClause.status;
      }

      if (reference) {
        console.log('Search by reference =======', reference);

        delete whereClause.status;
        delete whereClause.storagePointId;
        delete whereClause.type;
        delete whereClause.assignTo;
        isUserPurchaseAgent = false;
      }

      console.log('Where clause ==== ', whereClause, isUserPurchaseAgent);

      if (startDate && endDate) {
        if (reference) {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: Between(startDate, endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Between(startDate, endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: Between(startDate, endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Between(startDate, endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
              });
        } else {
          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
            relations: ['storagePoint', 'order', 'internalNeed', 'transfert'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allPurchaseOrders = await this._purchaseOrderRepository.findAndCount({
            where: {
              createdAt: Between(startDate, endDate),
              ...whereClause,
            },
          });
        }
      } else if (startDate && !endDate) {
        if (reference) {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: MoreThanOrEqual(startDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: MoreThanOrEqual(startDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: MoreThanOrEqual(startDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: MoreThanOrEqual(startDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
              });
        } else {
          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
            relations: ['storagePoint', 'order', 'internalNeed', 'transfert'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allPurchaseOrders = await this._purchaseOrderRepository.findAndCount({
            where: {
              createdAt: MoreThanOrEqual(startDate),
              ...whereClause,
            },
          });
        }
      } else if (!startDate && endDate) {
        if (reference) {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: LessThanOrEqual(endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: LessThanOrEqual(endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: LessThanOrEqual(endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: LessThanOrEqual(endDate),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
              });
        } else {
          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
            relations: ['storagePoint', 'order', 'internalNeed', 'transfert'],
            order: { createdAt: 'ASC' },
            skip,
            take,
          });

          allPurchaseOrders = await this._purchaseOrderRepository.findAndCount({
            where: {
              createdAt: LessThanOrEqual(endDate),
              ...whereClause,
            },
          });
        }
      } else if (specificDate) {
        if (reference) {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: Like(`${specificDate}%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${specificDate}%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: Like(`${specificDate}%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${specificDate}%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
              });
        } else {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: Like(`${specificDate}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${specificDate}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  createdAt: Like(`${specificDate}%`),
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: Like(`${specificDate}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${specificDate}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: Like(`${specificDate}%`),
                  ...whereClause,
                },
              });
        }
      } else if (yearValue) {
        if (reference) {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: Like(`${yearValue}-%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${yearValue}-%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: Like(`${yearValue}-%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${yearValue}-%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: Like(`${yearValue}-%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${yearValue}-%`),
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: Like(`${yearValue}-%`),
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
              });
        } else {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    createdAt: Like(`${yearValue}-%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${yearValue}-%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  createdAt: Like(`${yearValue}-%`),
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    createdAt: Like(`${yearValue}-%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    createdAt: Like(`${yearValue}-%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  createdAt: Like(`${yearValue}-%`),
                  ...whereClause,
                },
              });
        }
      } else {
        if (reference) {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    reference: Like(`%${reference}%`),
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: [
                  {
                    reference: Like(`%${reference}%`),
                    ...whereClause,
                  },
                  {
                    orderRef: Like(`%${reference}%`),
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    reference: Like(`%${reference}%`),
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    orderRef: Like(`%${reference}%`),
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  reference: Like(`%${reference}%`),
                  orderRef: Like(`%${reference}%`),
                  ...whereClause,
                },
              });
        } else {
          purchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.find({
                where: [
                  {
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              })
            : await this._purchaseOrderRepository.find({
                where: {
                  ...whereClause,
                },
                relations: [
                  'storagePoint',
                  'order',
                  'internalNeed',
                  'transfert',
                ],
                order: { createdAt: 'ASC' },
                skip,
                take,
              });

          allPurchaseOrders = isUserPurchaseAgent
            ? await this._purchaseOrderRepository.findAndCount({
                where: [
                  {
                    status: OperationStatus.PENDING,
                    ...whereClause,
                  },
                  {
                    status: OperationStatus.SAVED,
                    ...whereClause,
                  },
                ],
              })
            : await this._purchaseOrderRepository.findAndCount({
                where: {
                  status: Not(`"${OperationStatus.VALIDATED}"`),
                  ...whereClause,
                },
              });
        }
      }

      await Promise.all(
        purchaseOrders.map(async (purchaseOrder) => {
          if (purchaseOrder.transfert) {
            purchaseOrder.transfert = await this._transfertRepository.findOne({
              where: { id: purchaseOrder.transfert.id },
              relations: ['source', 'target'],
            });
          }

          return purchaseOrder;
        }),
      );

      return new GetPurchaseOrdersOutput(
        purchaseOrders.map(
          (purchaseOrder) => new MiniPurchaseOrderOutput(purchaseOrder, lang),
        ),
        allPurchaseOrders[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetPurchaseOrdersService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetPurchaseOrdersOptionsDto,
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
            `The storage point ${options.storagePointId} is not found.`,
          );
        }
      }

      return { ...pagination, ...options, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetPurchaseOrdersService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _userConFilter(user: UserCon): Promise<string[]> {
    try {
      const ids: string[] = [];

      if (
        user.workStation?.warehouse.reference === DRUOUT_WAREHOUSE_REFERENCE ||
        user.workStation?.warehouse.reference === SOUDANAISE_WAREHOUSE_REFERENCE
      ) {
        const warehouses_dla = await this._storagePointRepository.find({
          where: [
            { reference: DRUOUT_WAREHOUSE_REFERENCE },
            { reference: SOUDANAISE_WAREHOUSE_REFERENCE },
          ],
        });
        warehouses_dla.forEach((wh) => {
          if (!ids.includes(wh.id)) ids.push(wh.id);
        });
      }

      if (
        user.workStation?.warehouse.reference === CALAFATAS_WAREHOUSE_REFERENCE
      ) {
        const warehouses_yde = await this._storagePointRepository.find({
          where: [
            { reference: CALAFATAS_WAREHOUSE_REFERENCE },
            { reference: KATIOS_WAREHOUSE_REFERENCE },
          ],
        });
        warehouses_yde.forEach((wh) => {
          if (!ids.includes(wh.id)) ids.push(wh.id);
        });
      } else {
        const warehouse = await this._storagePointRepository.findOne({
          where: { reference: user.workStation.warehouse.reference },
        });
        if (!ids.includes(warehouse.id)) ids.push(warehouse.id);
      }

      console.log(ids);

      return ids;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        `${GetPurchaseOrdersService.name} - ${this._userConFilter.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
