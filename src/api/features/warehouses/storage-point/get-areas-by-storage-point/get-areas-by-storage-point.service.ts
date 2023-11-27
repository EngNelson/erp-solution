import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BooleanValues,
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
} from '@glosuite/shared';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import {
  GetAreasByStoragePointAreaOutput,
  GetAreasByStoragePointInput,
  GetAreasByStoragePointOutput,
} from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  isVirtual?: number | null;
};

type WhereClause = {
  storagePointId: string;
  isVirtual?: number;
};

@Injectable()
export class GetAreasByStoragePointService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async getAreasByStoragePoint(
    input: GetAreasByStoragePointInput,
  ): Promise<GetAreasByStoragePointOutput> {
    const validationResult = await this._tryValidation(input);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetAreasByStoragePointOutput =
      await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<GetAreasByStoragePointOutput> {
    try {
      const { storagePoint, pageIndex, pageSize, lang, isVirtual } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {
        storagePointId: storagePoint.id,
      };

      if (isVirtual) {
        whereClause.isVirtual = isVirtual;
      }

      const areas = await this._areaRepository.find({
        where: whereClause,
        relations: ['storagePoint', 'locations'],
        order: { title: 'ASC' },
        skip,
        take,
      });

      const outputs: {
        area: Area;
        totalVariants: number;
        totalItems: number;
      }[] = [];
      await Promise.all(
        areas.map(async (area) => {
          let totalItems = 0;
          let totalVariants = 0;
          const variantIds: string[] = [];
          area?.locations?.map(async (location) => {
            totalItems += location.totalItems;
            const children = await this._locationTreeRepository.findDescendants(
              location,
              { relations: ['productItems'] },
            );

            children?.map((child) => {
              child?.productItems.map((item) => {
                if (
                  !variantIds.some(
                    (variantId) => variantId === item.productVariantId,
                  )
                ) {
                  variantIds.push(item.productVariantId);
                  totalVariants++;
                }
              });
            });
          });

          outputs.push({ area, totalVariants, totalItems });
        }),
      );

      const allAreas = await this._areaRepository.findAndCount({
        where: whereClause,
      });

      return new GetAreasByStoragePointOutput(
        outputs.map(
          (output) =>
            new GetAreasByStoragePointAreaOutput(
              output.area,
              output.totalVariants,
              output.totalItems,
              storagePoint,
              lang,
            ),
        ),
        allAreas[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetAreasByStoragePointService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetAreasByStoragePointInput,
  ): Promise<ValidationResult> {
    try {
      const { storagePointId, pagination, options } = input;

      const storagePoint = await this._storagePointRepository.findOne({
        where: {
          id: storagePointId,
        },
        relations: ['address'],
      });

      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${storagePointId}' not found`,
        );
      }

      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : 1;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : 25;

      pagination.lang = pagination.lang ? pagination.lang : ISOLang.FR;

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

      let isVirtual: number | null;
      if (options.isVirtual) {
        isVirtual = options.isVirtual === BooleanValues.TRUE ? 1 : 0;
      }

      return { storagePoint, ...pagination, isVirtual };
    } catch (error) {
      throw new BadRequestException(
        `${GetAreasByStoragePointService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
