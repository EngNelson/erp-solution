import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { Area, Location } from 'src/domain/entities/warehouses';
import { AreaType } from 'src/domain/enums/warehouses';
import {
  AreaRepository,
  LocationRepository,
} from 'src/repositories/warehouses';
import { EditLocationInput } from './dto';

type ValidationResult = {
  location: Location;
  area?: Area;
  parentLocation?: Location;
  isArea: boolean;
  isParent: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditLocationService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
  ) {}

  async editLocation(
    input: EditLocationInput,
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
    input: EditLocationInput,
    result: ValidationResult,
  ): Promise<LocationItemOutput> {
    try {
      const { location, area, parentLocation, isArea, isParent, lang, user } =
        result;

      if (isArea) {
        location.area = area;
        location.areaId = area.id;
      }

      if (isParent) {
        location.parentLocation = parentLocation;
      }

      if (input.name) {
        location.name = input.name;
      }

      if (input.description) {
        if (!location.description) {
          location.description = input.description;
        } else {
          const inputLangs = Object.keys(input.description);
          inputLangs.forEach(
            (l) => (location.description[l] = input.description[l]),
          );
        }
      }

      location.isVirtual = input.isVirtual;
      location.isProviderDedicated = input.isProviderDedicated;

      if (input.dedicatedSupplier) {
        location.dedicatedSupplier = input.dedicatedSupplier;
        location.isVirtual = true;
      }

      if (input.space) {
        location.space = input.space;
        location.surface = input.space
          ? input.space.width * input.space.length
          : null;
        location.volume = input.space?.height
          ? location.surface * input.space.height
          : null;
      }

      location.updatedBy = user;

      await this._locationRepository.save(location);

      let totalVariants = 0;
      const variantIds: string[] = [];
      location.productItems.map((item) => {
        if (
          !variantIds.some((variantId) => variantId === item.productVariantId)
        ) {
          variantIds.push(item.productVariantId);
          totalVariants++;
        }
      });

      return new LocationItemOutput(location, totalVariants, lang);
    } catch (error) {
      throw new BadRequestException(
        `${EditLocationService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: EditLocationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const { locationId, areaId, parentLocationId, ...datas } = input;

      const location = await this._locationRepository.findOne({
        where: { id: locationId },
        relations: ['area', 'parentLocation', 'children', 'productItems'],
      });
      if (!location) {
        throw new NotFoundException(`Location to edit not found`);
      }

      if (location.type === AreaType.DEFAULT) {
        throw new BadRequestException(
          `You cannot edit ${location.type} location`,
        );
      }

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

      return {
        location,
        area,
        parentLocation,
        isArea: !!area,
        isParent: !!parentLocation,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditLocationService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
