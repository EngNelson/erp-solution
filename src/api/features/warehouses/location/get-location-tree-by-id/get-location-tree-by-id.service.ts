import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { LocationTreeOutput } from 'src/domain/dto/warehouses';
import { Location } from 'src/domain/entities/warehouses';
import {
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { GetLocationTreeByIdInput } from './dto';

@Injectable()
export class GetLocationTreeByIdService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async getLocationTreeById(
    input: GetLocationTreeByIdInput,
    user: UserCon,
  ): Promise<LocationTreeOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetLocationTreeByIdInput,
    user: UserCon,
  ): Promise<LocationTreeOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const location = await this._locationRepository.findOne({
        where: {
          id: input.locationId,
        },
      });
      if (!location) {
        throw new NotFoundException(`Location not found`);
      }

      const locationTree =
        await this._locationTreeRepository.findDescendantsTree(location);

      return new LocationTreeOutput(locationTree, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationTreeByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
