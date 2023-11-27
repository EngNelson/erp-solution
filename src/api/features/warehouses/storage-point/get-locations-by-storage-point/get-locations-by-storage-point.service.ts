import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import {
  GetLocationsByStoragePointInput,
  GetLocationsByStoragePointOutput,
} from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  lang: ISOLang;
};

@Injectable()
export class GetLocationsByStoragePointService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async getLocationsByStoragePoint(
    input: GetLocationsByStoragePointInput,
    user: UserCon,
  ): Promise<GetLocationsByStoragePointOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetLocationsByStoragePointOutput =
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
  ): Promise<GetLocationsByStoragePointOutput> {
    try {
      const { storagePoint, lang } = result;

      const areas = await this._areaRepository.find({
        where: { storagePointId: storagePoint.id },
        relations: ['locations'],
      });

      const locationsByStoragePoint: {
        child: Location;
        totalVariants: number;
      }[] = [];

      await Promise.all(
        areas.map(async (area) => {
          await Promise.all(
            area.locations?.map(async (location) => {
              const children =
                await this._locationTreeRepository.findDescendants(location, {
                  relations: ['productItems'],
                });

              children?.map((child) => {
                let totalVariants = 0;
                const variantIds: string[] = [];
                2;
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

                locationsByStoragePoint.push({ child, totalVariants });
              });
            }),
          );
        }),
      );

      return new GetLocationsByStoragePointOutput(
        locationsByStoragePoint.map(
          (location) =>
            new LocationItemOutput(
              location.child,
              location.totalVariants,
              lang,
            ),
        ),
        locationsByStoragePoint.length,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetLocationsByStoragePointService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetLocationsByStoragePointInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
      const { storagePointId } = input;

      const storagePoint = await this._storagePointRepository.findOne({
        where: {
          id: storagePointId,
        },
      });
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${storagePointId}' not found`,
        );
      }

      return { storagePoint, lang };
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationsByStoragePointService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
