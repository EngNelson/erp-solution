import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, MergeLocationsMap } from '@glosuite/shared';
import { Area, Location } from 'src/domain/entities/warehouses';
import { MergeLocationsMapping, NewLocationMapping } from 'src/domain/types';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';

@Injectable()
export class BuildMergeLocationsMappingService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
  ) {}

  async build(
    mergeLocationsMapping: MergeLocationsMap[],
    isTargetIsArea: boolean,
    isTargetIsLocation: boolean,
    area?: Area,
    location?: Location,
  ): Promise<MergeLocationsMapping[]> {
    const mergeLocationsDto: MergeLocationsMapping[] = [];

    await Promise.all(
      mergeLocationsMapping.map(async (mergeLocationsItem) => {
        const {
          locationSourceId,
          locationTargetId,
          isNewLocation,
          newLocation,
        } = mergeLocationsItem;

        let targetLocation: Location;
        let newLocationInput: NewLocationMapping;

        const sourceLocation = await this._locationRepository.findOne({
          where: {
            id: locationSourceId,
          },
        });
        if (sourceLocation) {
          throw new NotFoundException(
            `Location with id '${locationSourceId}' not found`,
          );
        }

        if (!isNewLocation) {
          targetLocation = await this._locationRepository.findOne({
            where: {
              id: locationTargetId,
            },
          });
          if (!targetLocation) {
            throw new NotFoundException(
              `Location with id '${locationTargetId}' not found`,
            );
          }
        } else {
          const { name, description, parentLocationId, areaId } = newLocation;
          let parentLocation: Location;
          let area: Area;

          if (isNullOrWhiteSpace(name)) {
            throw new BadRequestException(
              `name is required to create the new locations`,
            );
          }

          if (!isNullOrWhiteSpace(parentLocationId)) {
            parentLocation = await this._locationRepository.findOne({
              where: {
                id: parentLocationId,
              },
            });
            if (!parentLocation) {
              throw new NotFoundException(
                `Parent location for new location not found`,
              );
            }

            /**
             * Pour le cas de areas merge
             * On verifi si le parent location appartient a notre target area
             */
            if (isTargetIsArea) {
              const ancestors =
                await this._locationTreeRepository.findAncestors(
                  parentLocation,
                );
              const isParentLocationInTargetArea = ancestors.some(
                (ancestor) => ancestor.areaId === area.id,
              );
              if (!isParentLocationInTargetArea) {
                throw new BadRequestException(
                  `This parentLocation is not a target area child`,
                );
              }
            }

            /**
             * Pour le cas de locations merge
             * On verifi si le parent location appartient a notre target location
             */
            if (isTargetIsLocation) {
              const ancestors =
                await this._locationTreeRepository.findAncestors(
                  parentLocation,
                );
              const isParentLocationInTargetLocation = ancestors.some(
                (ancestor) => ancestor.id === location.id,
              );
              if (!isParentLocationInTargetLocation) {
                throw new BadRequestException(
                  `This parentLocation is not a target location child`,
                );
              }
            }
          } else {
            area = await this._areaRepository.findOne({
              where: { id: areaId },
            });
            if (!area) {
              throw new BadRequestException(`This area not found`);
            }
          }

          newLocationInput = {
            name,
            description,
            parentLocation,
            area,
            isParentLocation: !!parentLocation,
            isArea: !!area,
          };
        }

        mergeLocationsDto.push({
          sourceLocation,
          targetLocation,
          isNewLocation,
          newLocationInput,
        });
      }),
    );

    return mergeLocationsDto;
  }
}
