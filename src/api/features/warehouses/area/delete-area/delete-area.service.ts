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
import { Area, Location } from 'src/domain/entities/warehouses';
import { AreaType } from 'src/domain/enums/warehouses';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { DeleteAreaInput } from './dto';

type ValidationResult = {
  area: Area;
  locations: Location[];
  user: UserCon;
};

@Injectable()
export class DeleteAreaService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async deleteArea(input: DeleteAreaInput, user: UserCon): Promise<boolean> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return !!executionResult;
  }

  private async _tryExecution(result: ValidationResult): Promise<Area> {
    try {
      const { area, locations, user } = result;

      let locationsToDelete: Location[];

      area.deletedBy = user;

      this._areaRepository.softDelete(area.id);

      locations?.forEach(async (location) => {
        location.deletedBy = user;
        this._locationRepository.softDelete(location.id);
        locationsToDelete.push(location);
      });

      await this._areaRepository.save(area);
      if (locationsToDelete?.length > 0) {
        await this._locationRepository.save(locationsToDelete);
      }

      return area;
    } catch (error) {
      throw new ConflictException(
        `${DeleteAreaService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteAreaInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { areaId } = input;

      const area = await this._areaRepository.findOne({
        where: { id: areaId },
        relations: ['locations'],
      });
      if (!area) {
        throw new NotFoundException(`Area with id '${areaId}' not found`);
      }

      /**
       * Verifier si le area est de type default
       */
      if (area.type === AreaType.DEFAULT) {
        throw new BadRequestException(`You cannot delete ${area.type} area`);
      }

      /**
       * Verifier si le area a des emplacements avec des product-items
       * 1. on recupere tous les emplacements qui se trouve dans le area
       * 2. on verifi si au moins un emplacement contient au moins
       * un product-item
       */
      const areaLocations: Location[] = [];
      await Promise.all(
        area.locations?.map(async (location) => {
          const allChildren =
            await this._locationTreeRepository.findDescendants(location);
          areaLocations.push(...allChildren);
        }),
      );

      const isAreaHasItems = areaLocations.some((loc) => loc.totalItems > 0);

      if (isAreaHasItems) {
        throw new UnauthorizedException(
          `You cannot delete an area containing products`,
        );
      }

      return { area, locations: areaLocations, user };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteAreaService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
