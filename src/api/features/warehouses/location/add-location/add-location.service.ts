import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { AddLocationInput } from './dto';
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { Area, Location } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationRepository,
} from 'src/repositories/warehouses';
import { LocationBarcodeService } from 'src/services/generals';
import { LocationReferenceService } from 'src/services/references/warehouses';

type ValidationResult = {
  area: Area;
  parentLocation: Location;
  isChild: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddLocationService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    private readonly _locationBarCodeService: LocationBarcodeService,
    private readonly _locationReferenceService: LocationReferenceService,
  ) {}

  async addLocation(
    input: AddLocationInput,
    user: UserCon,
  ): Promise<LocationItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddLocationInput,
    result: ValidationResult,
  ): Promise<LocationItemOutput> {
    const location = new Location();

    try {
      const {
        name,
        description,
        space,
        isVirtual,
        isProviderDedicated,
        dedicatedSupplier,
        ...otherDatas
      } = input;
      const { area, parentLocation, isChild, lang, user } = result;

      location.reference = await this._locationReferenceService.generate();
      location.barCode = await this._locationBarCodeService.generate();
      location.name = name;
      location.description = description;
      location.space = space;
      location.surface = space ? space.width * space.length : null;
      location.volume = space?.height ? location.surface * space.height : null;
      location.isVirtual = isVirtual;
      location.isProviderDedicated = isProviderDedicated;
      if (isProviderDedicated) {
        location.dedicatedSupplier = dedicatedSupplier;
        location.isVirtual = true;
      }
      if (isChild) {
        location.parentLocation = parentLocation;
      } else {
        location.area = area;
        location.areaId = area.id;
      }
      location.createdBy = user;

      await this._locationRepository.save(location);

      return new LocationItemOutput(location, 0, lang);
    } catch (error) {
      if (location.id) {
        await this._locationRepository.delete(location.id);
      }

      throw new ConflictException(
        `${AddLocationService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddLocationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const { areaId, parentLocationId, ...datas } = input;

      let area: Area = null;
      let parentLocation: Location = null;

      if (!isNullOrWhiteSpace(areaId)) {
        area = await this._areaRepository.findOne({ where: { id: areaId } });
        if (!area) {
          throw new NotFoundException(`Area not found`);
        }
      }

      if (!isNullOrWhiteSpace(parentLocationId)) {
        parentLocation = await this._locationRepository.findOne({
          where: { id: parentLocationId },
        });
        if (!parentLocation) {
          throw new NotFoundException(`Parent location not found`);
        }
      }

      /**
       * We verify that we don't have any location
       * with the same name within the same area or location
       */
      // In the same area
      if (!isNullOrWhiteSpace(input.areaId)) {
        const isInputLocationNameExistInArea =
          await this._locationRepository.findOne({
            where: { name: input.name, areaId: input.areaId },
          });
        if (isInputLocationNameExistInArea) {
          throw new ConflictException(
            `Another location with the name ${input.name} already exist in ${area.title} area`,
          );
        }
      }

      // In the same location
      if (!isNullOrWhiteSpace(input.parentLocationId)) {
        const isInputLocationNameExistInParentLocation =
          await this._locationRepository.findOne({
            where: { name: input.name },
            relations: ['parentLocation'],
          });
        if (
          isInputLocationNameExistInParentLocation &&
          isInputLocationNameExistInParentLocation.parentLocation.id ===
            parentLocationId
        ) {
          throw new ConflictException(
            `Another location with the name ${input.name} already exist in ${parentLocation.name} location`,
          );
        }
      }

      return { area, parentLocation, isChild: !!parentLocation, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${AddLocationService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
