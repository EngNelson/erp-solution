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
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { Area, Location } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { GetLocationsByAreaInput, GetLocationsByAreaOutput } from './dto';

type ValidationResult = {
  area: Area;
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  isVirtual?: number | null;
};

type WhereClause = {
  areaId: string;
  isVirtual?: number;
};

@Injectable()
export class GetLocationsByAreaService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async getLocationsByArea(
    input: GetLocationsByAreaInput,
  ): Promise<GetLocationsByAreaOutput> {
    const validationResult = await this._tryValidation(input);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetLocationsByAreaOutput = await this._tryExecution(
      validationResult,
    );

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
  ): Promise<GetLocationsByAreaOutput> {
    try {
      const { area, pageIndex, pageSize, lang, isVirtual } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = { areaId: area.id };

      if (isVirtual) {
        whereClause.isVirtual = isVirtual;
      }

      const locations = await this._locationRepository.find({
        where: whereClause,
        relations: ['area', 'parentLocation', 'children', 'productItems'],
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      const locationsSlot: { child: Location; totalVariants: number }[] = [];
      await Promise.all(
        locations?.map(async (location) => {
          const children = await this._locationTreeRepository.findDescendants(
            location,
            { relations: ['productItems'] },
          );

          children?.map((child) => {
            let totalVariants = 0;
            const variantIds: string[] = [];
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

            locationsSlot.push({ child, totalVariants });
          });
        }),
      );

      const locationsByArea = await this._locationRepository.find({
        where: whereClause,
      });

      const allLocations: Location[] = [];
      await Promise.all(
        locationsByArea?.map(async (location) => {
          const allChildren =
            await this._locationTreeRepository.findDescendants(location);
          allLocations.push(...allChildren);
        }),
      );

      return new GetLocationsByAreaOutput(
        locationsSlot.map(
          (loc) => new LocationItemOutput(loc.child, loc.totalVariants, lang),
        ),
        allLocations.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationsByAreaService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetLocationsByAreaInput,
  ): Promise<ValidationResult> {
    try {
      const { areaId, pagination, options } = input;

      const area = await this._areaRepository.findOne({
        where: { id: areaId },
      });
      if (!area) {
        throw new NotFoundException(`Area with id '${areaId}' not found`);
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

      return { area, ...pagination, isVirtual };
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationsByAreaService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
