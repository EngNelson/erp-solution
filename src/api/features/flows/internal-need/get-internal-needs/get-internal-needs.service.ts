import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import { MiniInternalNeedOutput } from 'src/domain/dto/flows';
import { InternalNeed } from 'src/domain/entities/flows';
import { InternalNeedRepository } from 'src/repositories/flows';
import { GetInternalNeedsInput, GetInternalNeedsOutput } from './dto';
import { InternalNeedStatus } from 'src/domain/enums/flows';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  user: UserCon;
};

type WhereClause = {
  createdBy?: UserCon;
  addressTo?: UserCon;
  status?: InternalNeedStatus;
};

@Injectable()
export class GetInternalNeedsService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
  ) {}

  async getInternalNeeds(
    input: GetInternalNeedsInput,
    user: UserCon,
  ): Promise<GetInternalNeedsOutput> {
    const validationResult = await this._tryValidation(input.pagination, user);

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
  ): Promise<GetInternalNeedsOutput> {
    try {
      const { pageIndex, pageSize, lang, user } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};

      // if (
      //   !user.roles.some(
      //     (role) =>
      //       role === AgentRoles.SUPER_ADMIN ||
      //       role === AgentRoles.ADMIN ||
      //       role === AgentRoles.DG ||
      //       role === AgentRoles.DAF ||
      //       role === AgentRoles.WAREHOUSE_MANAGER,
      //   )
      // ) {
      //   whereClause.createdBy = user;
      // }

      if (
        user.roles.some(
          (role) => role === AgentRoles.DG || role === AgentRoles.DAF,
        )
      ) {
        // whereClause.addressTo = user;
        whereClause.status = InternalNeedStatus.SENDED;
      }

      const internalNeeds = await this._internalNeedRepository.find({
        where: whereClause,
        order: { createdAt: 'ASC' },
        skip,
        take,
      });

      // console.log(user);

      // console.log(internalNeeds[0].addressTo);

      const [allInternalNeeds, count] =
        await this._internalNeedRepository.findAndCount({ where: whereClause });

      return new GetInternalNeedsOutput(
        internalNeeds.map(
          (internalNeed) => new MiniInternalNeedOutput(internalNeed),
        ),
        count,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetInternalNeedsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      // if (
      //   !user.roles.some(
      //     (role) =>
      //       role === AgentRoles.SUPER_ADMIN ||
      //       role === AgentRoles.ADMIN ||
      //       role === AgentRoles.DG ||
      //       role === AgentRoles.DAF ||
      //       role === AgentRoles.WAREHOUSE_MANAGER,
      //   ) &&
      //   !user.workStation.isManager
      // ) {
      //   throw new UnauthorizedException(
      //     `You don't have access on this. You are not a ${AgentRoles.SUPER_ADMIN} or an ${AgentRoles.ADMIN} or ${AgentRoles.DG} or ${AgentRoles.DAF} or a service manager`,
      //   );
      // }

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

      return { ...pagination, user };
    } catch (error) {
      throw new BadRequestException(
        `${GetInternalNeedsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
