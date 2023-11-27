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
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import {
  GetInvestigationsOptionsDto,
  MiniInvestigationOutput,
} from 'src/domain/dto/flows';
import { Investigation } from 'src/domain/entities/flows';
import { InvestigationStatus } from 'src/domain/enums/flows';
import { InvestigationRepository } from 'src/repositories/flows';
import { GetInvestigationsInput, GetInvestigationsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  status?: InvestigationStatus;
};

type WhereClause = {
  status?: InvestigationStatus;
};

@Injectable()
export class GetInvestigationsService {
  constructor(
    @InjectRepository(Investigation)
    private readonly _investigationRepository: InvestigationRepository,
  ) {}

  async getInvestigations(
    input: GetInvestigationsInput,
    user: UserCon,
  ): Promise<GetInvestigationsOutput> {
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
  ): Promise<GetInvestigationsOutput> {
    try {
      const { pageIndex, pageSize, lang, status } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = status ? { status } : {};
      console.log(whereClause);

      const investigations = await this._investigationRepository.find({
        where: whereClause,
        order: { createdAt: 'ASC' },
        skip,
        take,
      });

      const [allInvestigations, count] =
        await this._investigationRepository.findAndCount({
          where: whereClause,
        });

      return new GetInvestigationsOutput(
        investigations.map(
          (investigation) => new MiniInvestigationOutput(investigation),
        ),
        count,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetInvestigationsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetInvestigationsOptionsDto,
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

      return { ...pagination, status: options.status };
    } catch (error) {
      throw new BadRequestException(
        `${GetInvestigationsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
