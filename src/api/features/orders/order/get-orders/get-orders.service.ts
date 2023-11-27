import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  BooleanValues,
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationInput,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import {
  GetOrdersOptionsDto,
  MiniOrderListOutput,
} from 'src/domain/dto/orders';
import { Order } from 'src/domain/entities/orders';
import {
  DeliveryMode,
  OrderSource,
  OrderStep,
  OrderVersion,
  ToBeCashed,
} from 'src/domain/enums/orders';
import { OrderRepository } from 'src/repositories/orders';
import { OrderService } from 'src/services/generals';
import { GetOrdersInput, GetOrdersOutput } from './dto';
import {
  InstalmentType,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { StepStatus } from 'src/domain/enums/flows';
import {
  Between,
  FindOperator,
  In,
  IsNull,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { Address } from 'src/domain/entities/shared';
import { AddressRepository } from 'src/repositories/shared';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  user: UserCon;
  reference?: string;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
  paymentMethod?: PaymentMethod;
  storagePointId?: string;
  assignToId?: string;
  withInstalments?: BooleanValues;
  advance?: BooleanValues;
  instalmentType?: InstalmentType;
  orderStep?: OrderStep;
  orderStatus?: StepStatus;
  orderSource?: OrderSource;
  preferedDeliveryDate?: Date;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  deliveryMode?: DeliveryMode;
  sellerCode?: string;
  addressIds?: string[];
  filterOnAddress: boolean;
};

type WhereClause = {
  version: OrderVersion;
  parent?: string | null;
  orderStatus?: FindOperator<string> | string;
  deliveryMode?: DeliveryMode;
  storagePointId?: string;
  assignToId?: string;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  instalmentType?: InstalmentType;
  toBeCashed?: ToBeCashed;
  orderStep?: OrderStep;
  orderSource?: OrderSource;
  paymentMethod?: PaymentMethod;
  sellerCode?: string;
  preferedDeliveryDate?: Date;
  deliveryAddressId?: string;
  billingAddressId?: string;
  instalments?: FindOperator<string>;
  advance?: FindOperator<string>;
};

@Injectable()
export class GetOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _orderService: OrderService,
  ) {}

  async getOrders(
    input: GetOrdersInput,
    user: UserCon,
  ): Promise<GetOrdersOutput> {
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
  ): Promise<GetOrdersOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        user,
        reference,
        startDate,
        endDate,
        specificDate,
        paymentMethod,
        storagePointId,
        assignToId,
        withInstalments,
        advance,
        instalmentType,
        orderStep,
        orderStatus,
        orderSource,
        preferedDeliveryDate,
        paymentStatus,
        paymentMode,
        deliveryMode,
        sellerCode,
        addressIds,
        filterOnAddress,
      } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const userConFilter = await this._orderService.getUserConFilter(user);

      // console.log('USER CON FILTER === ', userConFilter);

      const whereClause: WhereClause = {
        version: OrderVersion.CURRENT,
        parent: null,
      };

      if (storagePointId) whereClause.storagePointId = storagePointId;

      if (assignToId) whereClause.assignToId = assignToId;

      if (userConFilter.orderStatus && userConFilter.orderStatus.length > 0) {
        whereClause.orderStatus = In(userConFilter.orderStatus);
      }
      if (userConFilter.deliveryMode) {
        whereClause.deliveryMode = userConFilter.deliveryMode;
      }
      if (userConFilter.storagePoint) {
        whereClause.storagePointId = userConFilter.storagePoint.id;
      }
      if (userConFilter.toBeCashed) {
        whereClause.toBeCashed = userConFilter.toBeCashed;
      }

      if (orderStatus) whereClause.orderStatus = orderStatus;
      if (deliveryMode) whereClause.deliveryMode = deliveryMode;
      if (paymentStatus) whereClause.paymentStatus = paymentStatus;
      if (paymentMode) whereClause.paymentMode = paymentMode;
      if (instalmentType) whereClause.instalmentType = instalmentType;
      if (orderStep) whereClause.orderStep = orderStep;
      if (orderSource) whereClause.orderSource = orderSource;
      if (paymentMethod) whereClause.paymentMethod = paymentMethod;
      if (preferedDeliveryDate)
        whereClause.preferedDeliveryDate = preferedDeliveryDate;
      if (withInstalments) {
        if (withInstalments === BooleanValues.TRUE) {
          whereClause.instalments = Not(null);
        } else {
          whereClause.instalments = IsNull();
        }
      }
      if (advance) {
        if (advance === BooleanValues.TRUE) {
          whereClause.advance = Not(null);
        } else {
          whereClause.advance = IsNull();
        }
      }
      if (reference) {
        userConFilter.orderStatus = [
          StepStatus.TO_BUY,
          StepStatus.ASSIGNED,
          StepStatus.CANCELED,
          StepStatus.COMPLETE,
          StepStatus.DELIVERED,
          StepStatus.TO_RECEIVED,
          StepStatus.INFO_CLIENT,
          StepStatus.DELIVERED,
          StepStatus.PICKED_UP,
          StepStatus.READY,
          StepStatus.REFUNDED,
          StepStatus.REPORTED,
          StepStatus.TO_BUY,
          StepStatus.TO_DELIVER,
          StepStatus.TO_PICK_PACK,
          StepStatus.TO_TREAT,
          StepStatus.TO_TRANSFER,
          StepStatus.AWAITING_SAV,
        ];
        whereClause.orderStatus = In(userConFilter.orderStatus);
        if (whereClause.storagePointId) {
          delete whereClause.storagePointId;
        }
        if (whereClause.deliveryMode) {
          delete whereClause.deliveryMode;
        }
      }

      console.log('WHERE CLAUSE === ', whereClause);

      let order: Order[] = [];
      let allOrder: [Order[], number] = [[], 0];

      if (startDate && endDate) {
        if (sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (sellerCode && !reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Between(startDate, endDate),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Between(startDate, endDate),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (!sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Between(startDate, endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            });
          }
        } else {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Between(startDate, endDate),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Between(startDate, endDate),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Between(startDate, endDate),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Between(startDate, endDate),
                ...whereClause,
              },
            });
          }
        }
      } else if (startDate && !endDate) {
        if (sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (sellerCode && !reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (!sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            });
          }
        } else {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: MoreThanOrEqual(startDate),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: MoreThanOrEqual(startDate),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: MoreThanOrEqual(startDate),
                ...whereClause,
              },
            });
          }
        }
      } else if (!startDate && endDate) {
        if (sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (sellerCode && !reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: LessThanOrEqual(endDate),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: LessThanOrEqual(endDate),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (!sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: LessThanOrEqual(endDate),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            });
          }
        } else {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: LessThanOrEqual(endDate),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: LessThanOrEqual(endDate),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: LessThanOrEqual(endDate),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: LessThanOrEqual(endDate),
                ...whereClause,
              },
            });
          }
        }
      } else if (specificDate) {
        if (sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (sellerCode && !reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Like(`${specificDate}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Like(`${specificDate}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (!sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Like(`${specificDate}%`),
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            });
          }
        } else {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  createdAt: Like(`${specificDate}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  createdAt: Like(`${specificDate}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                createdAt: Like(`${specificDate}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                createdAt: Like(`${specificDate}%`),
                ...whereClause,
              },
            });
          }
        }
      } else {
        if (sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  reference: Like(`%${reference}%`),
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                reference: Like(`%${reference}%`),
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (sellerCode && !reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  sellerCode: Like(`%${sellerCode}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  sellerCode: Like(`%${sellerCode}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                sellerCode: Like(`%${sellerCode}%`),
                ...whereClause,
              },
            });
          }
        } else if (!sellerCode && reference) {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  reference: Like(`%${reference}%`),
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  reference: Like(`%${reference}%`),
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                reference: Like(`%${reference}%`),
                ...whereClause,
              },
            });
          }
        } else {
          if (filterOnAddress) {
            order = await this._orderRepository.find({
              where: [
                {
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: [
                {
                  deliveryAddressId: In(addressIds),
                  ...whereClause,
                },
                {
                  billingAddressId: In(addressIds),
                  ...whereClause,
                },
              ],
            });
          } else {
            order = await this._orderRepository.find({
              where: {
                ...whereClause,
              },
              relations: ['storagePoint', 'deliveryAddress'],
              order: { createdAt: 'ASC' },
              skip,
              take,
            });

            allOrder = await this._orderRepository.findAndCount({
              where: {
                ...whereClause,
              },
            });
          }
        }
      }

      return new GetOrdersOutput(
        order.map((order) => new MiniOrderListOutput(order)),
        allOrder[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOrdersService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetOrdersOptionsDto,
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
        const storagePoint = await this._storagePointRepository.findOne({
          where: { id: options.storagePointId },
        });
        if (!storagePoint) {
          throw new NotFoundException(
            `The storage point of id ${options.storagePointId} is not found`,
          );
        }
      }

      // Get potentials addresses
      const addressIds: string[] = [];
      let addresses: Address[] = [];
      let city: string;
      let quarter: string;

      if (options.city && !isNullOrWhiteSpace(options.city)) {
        city = options.city;
      }

      if (options.quarter && !isNullOrWhiteSpace(options.quarter)) {
        quarter = options.quarter;
      }

      if (city && quarter) {
        addresses = await this._addressRepository.find({
          where: {
            city: Like(`%${options.city}%`),
            quarter: Like(`%${options.quarter}%`),
          },
        });
      } else if (city && !quarter) {
        addresses = await this._addressRepository.find({
          where: {
            city: Like(`%${options.city}%`),
          },
        });
      } else if (!city && quarter) {
        addresses = await this._addressRepository.find({
          where: {
            quarter: Like(`%${options.quarter}%`),
          },
        });
      }

      if (addresses.length > 0) {
        addresses.forEach((address) => addressIds.push(address.id));
      }

      if (
        user.roles.some(
          (role) =>
            role === AgentRoles.EXPEDITION_SUPERVISOR ||
            role === AgentRoles.EXPEDITION_AGENT,
        ) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.FLEET_SUPERVISOR,
        )
      ) {
      }

      if (!!city || !!quarter)
        console.log('FILTER ON ADDRESS IDS ====== ', addressIds);

      return {
        ...pagination,
        user,
        ...options,
        addressIds,
        filterOnAddress: !!city || !!quarter,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOrdersService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
