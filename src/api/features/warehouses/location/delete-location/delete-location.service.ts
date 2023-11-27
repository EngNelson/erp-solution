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
import { Location } from 'src/domain/entities/warehouses';
import { AreaType } from 'src/domain/enums/warehouses';
import {
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { DeleteLocationInput } from './dto';

type ValidationResult = {
  location: Location;
  children: Location[];
  user: UserCon;
};

@Injectable()
export class DeleteLocationService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async deleteLocation(
    input: DeleteLocationInput,
    user: UserCon,
  ): Promise<boolean> {
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

  private async _tryExecution(result: ValidationResult): Promise<Location> {
    try {
      const { location, children, user } = result;

      const locationsToDelete: Location[] = [];

      children?.forEach(async (child) => {
        child.deletedBy = user;
        this._locationRepository.softDelete(child.id);
        locationsToDelete.push(child);
      });

      location.deletedBy = user;
      this._locationRepository.softDelete(location.id);
      locationsToDelete.push(location);

      await this._locationRepository.save(locationsToDelete);

      return location;
    } catch (error) {
      throw new ConflictException(
        `${DeleteLocationService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteLocationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const location = await this._locationRepository.findOne({
        where: {
          id: input.locationId,
        },
      });
      if (!location) {
        throw new NotFoundException(`Location not found`);
      }

      /**
       * Verifier si l'emplacemenet est de type default
       */
      if (location.type === AreaType.DEFAULT) {
        throw new BadRequestException(
          `You cannot delete ${location.type} location`,
        );
      }

      /**
       * Verifier si l'emplacement ou ses sous emplacements a des product-items
       * 1. on recupere tous les sous emplacements
       * 2. on verifi si au moins un emplacement contient au moins
       * un product-item
       * 3. on verifi si l'emplacement a supprimer contient au moins un product-item
       */
      const allLocations = await this._locationTreeRepository.findDescendants(
        location,
      );

      const isLocationHasItems = allLocations.some((loc) => loc.totalItems > 0);

      if (isLocationHasItems) {
        throw new UnauthorizedException(
          `You cannot delete a location containing products`,
        );
      }

      return { location, children: allLocations, user };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteLocationService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
