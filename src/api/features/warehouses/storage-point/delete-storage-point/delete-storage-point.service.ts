import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCon } from '@glosuite/shared';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { DeleteStoragePointInput } from './dto';
import { STORAGE_POINT_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';

type ValidationResult = {
  storagePoint: StoragePoint;
  areas: Area[];
  locations: Location[];
  parentLocations: Location[];
  user: UserCon;
};

@Injectable()
export class DeleteStoragePointService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    private readonly _httpService: HttpService,
  ) {}

  async deleteStoragePoint(
    input: DeleteStoragePointInput,
    user: UserCon,
    accessToken?,
  ): Promise<boolean> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      validationResult,
      accessToken,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return !!executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
    accessToken,
  ): Promise<StoragePoint> {
    try {
      const { storagePoint, areas, locations, parentLocations, user } = result;

      const areasToDelete: Area[] = [];
      const locationsToDelete: Location[] = [];

      storagePoint.deletedBy = user;

      // locations?.map(async (location) => {
      //   location.deletedBy = user;
      //   locationsToDelete.push(location);
      //   this._locationRepository.softDelete(location.id);
      // });

      // if (locationsToDelete.length > 0) {
      //   await this._locationRepository.save(locationsToDelete);
      // }

      areas?.map(async (area) => {
        area.deletedBy = user;
        areasToDelete.push(area);
        this._areaRepository.softDelete(area.id);
      });

      if (areasToDelete.length > 0) {
        await this._areaRepository.save(areasToDelete);
      }

      this._storagePointRepository.softDelete(storagePoint.id);
      await this._storagePointRepository.save(storagePoint);

      /**
       * Delete the storage point on auth
       */

      const path = `${process.env.AUTH_API_PATH}/${STORAGE_POINT_RESOURCE}/${storagePoint.reference}`;

      console.log('AUTH ENDPOINT ', path);

      await this._httpService.axiosRef
        .delete(path, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        })
        .then((response) => {
          console.log(
            `${response.config.method} on ${response.config.url}. Ref=${
              storagePoint.reference + ' - Name=' + storagePoint.name
            }, Result=${response.statusText}`,
          );
        })
        .catch((error) => {
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        });

      return storagePoint;
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${DeleteStoragePointService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteStoragePointInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const storagePoint = await this._storagePointRepository.findOne({
        where: {
          id: input.storagePointId,
        },
      });
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${input.storagePointId}' not found`,
        );
      }

      /**
       * Verifier si le storage point a des emplacements avec des product-items
       * 1. on recupere tous les emplacements qui se trouve dans le storage point
       * 2. on verifi si au moins un emplacement contient au moins
       * un product-item
       */
      const areas = await this._areaRepository.find({
        where: { storagePointId: storagePoint.id },
        relations: ['locations'],
      });

      const storagePointLocations: Location[] = [];
      const parentLocations: Location[] = [];

      await Promise.all(
        areas.map(async (area) => {
          await Promise.all(
            area.locations?.map(async (location) => {
              const children =
                await this._locationTreeRepository.findDescendants(location);

              storagePointLocations.push(...children);
              const parent = await this._locationTreeRepository.findOne({
                where: { id: location.id },
              });
              parentLocations.push(parent);
            }),
          );
        }),
      );

      const isStoragePointHaveItems = storagePointLocations.some(
        (location) => location.totalItems > 0,
      );
      if (isStoragePointHaveItems) {
        throw new UnauthorizedException(
          `You cannot delete a storage point containing products`,
        );
      }

      return {
        storagePoint,
        areas,
        locations: storagePointLocations.reverse(),
        parentLocations,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${DeleteStoragePointService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
