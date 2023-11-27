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
  UserCon,
} from '@glosuite/shared';
import { MiniCustomerReturnOutput } from 'src/domain/dto/flows';
import { CustomerReturn } from 'src/domain/entities/flows';
import {
  CustomerReturnState,
  CustomerReturnStatus,
} from 'src/domain/enums/flows';
import { CustomerReturnRepository } from 'src/repositories/flows';
import { Like } from 'typeorm';
import { GetCustomerReturnsOptionsDto } from 'src/domain/dto/flows/get-custumer-return-options.dto';
import { Order } from 'src/domain/entities/orders';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OrderRepository } from 'src/repositories/orders';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetCustomerReturnsInput, GetCustomerReturnsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  reference?: string;
  status?: CustomerReturnStatus;
  state?: CustomerReturnState;
  orderId?: string;
  storagePointId?: string;
};

type WhereClause = {
  status?: CustomerReturnStatus;
  state?: CustomerReturnState;
  storagePointId?: string;
  orderId?: string;
};

@Injectable()
export class GetCustomerReturnsService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getCustomerReturn(
    input: GetCustomerReturnsInput,
    user: UserCon,
  ): Promise<GetCustomerReturnsOutput> {
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
  ): Promise<GetCustomerReturnsOutput> {
    try {
      const {
        pageIndex,
        pageSize,
        lang,
        reference,
        status,
        state,
        orderId,
        storagePointId,
      } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};
      if (status) whereClause.status = status;
      if (state) whereClause.state = state;
      if (orderId) whereClause.orderId = orderId;
      if (storagePointId) whereClause.storagePointId = storagePointId;

      let customerReturns: CustomerReturn[] = [];
      let allCustomerReturns: [CustomerReturn[], number] = [[], 0];

      if (reference) {
        customerReturns = await this._customerReturnRepository.find({
          where: [
            {
              reference: Like(`%${reference}%`),
              ...whereClause,
            },
          ],
          order: { createdAt: 'ASC' },
          skip,
          take,
        });

        allCustomerReturns = await this._customerReturnRepository.findAndCount({
          where: {
            reference: Like(`%${reference}%`),
            ...whereClause,
          },
        });
      } else {
        customerReturns = await this._customerReturnRepository.find({
          where: {
            ...whereClause,
          },
          order: { createdAt: 'ASC' },
          skip,
          take,
        });

        allCustomerReturns = await this._customerReturnRepository.findAndCount({
          where: {
            ...whereClause,
          },
        });
      }

      return new GetCustomerReturnsOutput(
        customerReturns.map(
          (customerreturn) => new MiniCustomerReturnOutput(customerreturn),
          lang,
        ),
        allCustomerReturns[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetCustomerReturnsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetCustomerReturnsOptionsDto,
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

      if (options.orderId && !isNullOrWhiteSpace(options.orderId)) {
        const order = await this._orderRepository.findOne({
          where: { id: options.orderId },
        });

        if (!order) {
          throw new NotFoundException(
            `Order of id ${options.orderId} is not found`,
          );
        }
      }

      return { ...pagination, ...options };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetCustomerReturnsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
