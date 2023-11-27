import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class LocationReferenceService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    try {
      const [locations, count] = await this._locationRepository.findAndCount({
        withDeleted: true,
      });
      const suffix = await this._sharedService.generateSuffix(count + 1, 8);

      return `LOC-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
