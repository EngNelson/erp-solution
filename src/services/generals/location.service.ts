import { isNullOrWhiteSpace } from '@glosuite/shared';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
  ) {}

  async getLocationAncestor(location: Location): Promise<Location> {
    try {
      const parents = await this._locationTreeRepository.findAncestors(
        location,
      );

      const ancestor = parents.find(
        (ancestor) => !isNullOrWhiteSpace(ancestor.areaId),
      );

      return ancestor;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  async getLocationStoragePoint(location: Location): Promise<StoragePoint> {
    try {
      const parents = await this._locationTreeRepository.findAncestors(
        location,
      );

      const ancestor = parents.find((parent) => !!parent.areaId);

      const area = await this._areaRepository.findOne({
        where: { id: ancestor.areaId },
        relations: ['storagePoint'],
      });

      return area.storagePoint;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }
}
