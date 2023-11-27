import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CurrencyMap,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { MergeLocationsMapping, NewLocationMapping } from 'src/domain/types';
import { MergeStoragePointsInput } from './dto';
import { DeleteStoragePointService } from '../delete-storage-point/delete-storage-point.service';
import { DeleteStoragePointInput } from '../delete-storage-point/dto';
import { StoragePointTreeOutput } from 'src/domain/dto/warehouses';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';

type ValidationResult = {
  sourceStoragePoint: StoragePoint;
  targetStoragePoint: StoragePoint;
  mergeLocationsDto: MergeLocationsMapping[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class MergeStoragePointsService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _deleteStoragePointService: DeleteStoragePointService,
  ) {}

  async mergeStoragePoints(
    input: MergeStoragePointsInput,
    user: UserCon,
  ): Promise<StoragePointTreeOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<StoragePointTreeOutput> {
    try {
      const {
        sourceStoragePoint,
        targetStoragePoint,
        mergeLocationsDto,
        lang,
        user,
      } = result;

      let productItemsEditedToEmit: ProductItem[];
      let locationsCreatedToEmit: Location[];
      let locationsEditedToEmit: Location[];

      mergeLocationsDto.forEach(async (mergeLocationDto) => {
        const {
          sourceLocation,
          targetLocation,
          isNewLocation,
          newLocationInput,
        } = mergeLocationDto;

        /**
         * Get all product items from source to move in the target location
         * or in the new tcreated location
         */
        const productItemsToMove = await this._productItemRepository.find({
          relations: ['purchaseCost'],
          where: { locationId: sourceLocation.id },
        });

        if (productItemsToMove && productItemsToMove.length > 0) {
          if (isNewLocation) {
            const {
              name,
              description,
              parentLocation,
              area,
              isParentLocation,
              isArea,
            } = newLocationInput;

            /**
             * Create the new location on the target storage point
             */
            const newLocation = new Location();

            newLocation.name = name;
            newLocation.description = description;

            if (isParentLocation) {
              newLocation.parentLocation = parentLocation;
            }

            if (isArea) {
              newLocation.area = area;
              newLocation.areaId = area.id;
            }

            newLocation.createdBy = user;

            await this._locationRepository.save(newLocation);

            /**
             * Move all product items from source location to target location (newLocation)
             */
            productItemsToMove.forEach((item) => {
              item.location = newLocation;
              item.locationId = newLocation.id;
              /**
               * Updated location items and totalCost
               */
              newLocation.totalItems++;
              newLocation.stockValue = this._updateLocationItemsCost(
                item,
                newLocation,
              );
            });

            locationsCreatedToEmit.push(newLocation);
          } else {
            /**
             * if not new location
             * move all product items from source location to the target one
             */
            productItemsToMove.forEach((item) => {
              item.location = targetLocation;
              item.locationId = targetLocation.id;
              /**
               * Updated location items and totalCost
               */
              targetLocation.totalItems++;
              targetLocation.stockValue = this._updateLocationItemsCost(
                item,
                targetLocation,
              );
            });

            await this._locationRepository.save(targetLocation);

            locationsEditedToEmit.push(targetLocation);
          }

          await this._productItemRepository.save(productItemsToMove);

          productItemsEditedToEmit.push(...productItemsToMove);
        }
      });

      /**
       * Delete all areas and locations from source storage point
       * And then delete the source storage point
       * emit deleted source storage point on event
       */
      const inputDeleteStoragePoint: DeleteStoragePointInput = {
        storagePointId: sourceStoragePoint.id,
      };
      await this._deleteStoragePointService.deleteStoragePoint(
        inputDeleteStoragePoint,
        user,
      );

      await Promise.all(
        targetStoragePoint.areas?.map(async (area) => {
          const areaDetails = await this._areaRepository.findOne({
            where: { id: area.id },
            relations: ['locations'],
          });

          areaDetails?.locations?.forEach(async (location) => {
            const locationTree =
              await this._locationTreeRepository.findDescendantsTree(location);

            if (locationTree.id !== location.id)
              areaDetails.locations.push(locationTree);
          });

          return areaDetails;
        }),
      );

      return new StoragePointTreeOutput(targetStoragePoint, lang);
    } catch (error) {
      throw new BadRequestException(
        `${MergeStoragePointsService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: MergeStoragePointsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = ISOLang.FR;

      const {
        storagePointSourceId,
        storagePointTargetId,
        mergeLocationsMapping,
      } = input;

      const sourceStoragePoint = await this._storagePointRepository.findOne({
        where: {
          id: storagePointSourceId,
        },
        relations: ['areas'],
      });
      if (!sourceStoragePoint) {
        throw new NotFoundException(
          `The source storage point with id '${storagePointSourceId}' not found`,
        );
      }

      const targetStoragePoint = await this._storagePointRepository.findOne({
        where: {
          id: storagePointTargetId,
        },
        relations: ['areas'],
      });
      if (!targetStoragePoint) {
        throw new NotFoundException(
          `The target storage point with id '${storagePointTargetId}' not found`,
        );
      }

      /**
       * Recuperer tous les emplacements de l'entrepot source
       * et verifier qu'ils sont tous present dans le tableau
       * mergeLocationsMapping
       */
      let sourceStoragePointLocations: Location[];
      sourceStoragePoint.areas.forEach(async (area) => {
        const areaFromStoragePointSource = await this._areaRepository.findOne({
          where: { id: area.id },
          relations: ['locations'],
        });
        if (areaFromStoragePointSource) {
          areaFromStoragePointSource.locations.forEach(
            async (locationFromStoragePointSource) => {
              sourceStoragePointLocations.push(locationFromStoragePointSource);
              const children =
                await this._locationTreeRepository.findDescendants(
                  locationFromStoragePointSource,
                );
              sourceStoragePointLocations.push(...children);
            },
          );
        }
      });

      const isEachLocationFromSourcePresentOnMapping =
        sourceStoragePointLocations.some(
          (loc) =>
            loc.totalItems > 0 &&
            mergeLocationsMapping.some(
              (mergeLoc) => loc.id === mergeLoc.locationSourceId,
            ),
        );

      if (!isEachLocationFromSourcePresentOnMapping) {
        throw new UnauthorizedException(
          `Merge cannot be performed because some locations with products have not been moved to the new warehouse`,
        );
      }

      /**
       * Construire le tableau mergeLocationsMapping
       */
      const mergeLocationsDto: MergeLocationsMapping[] = [];
      mergeLocationsMapping.forEach(async (mergeLocationsItem) => {
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
            throw new BadRequestException(`name is required`);
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
          }

          if (!isNullOrWhiteSpace(areaId)) {
            area = await this._areaRepository.findOne({
              where: { id: areaId },
            });
            if (!area) {
              throw new NotFoundException(`Area for new location not found`);
            }

            if (area.storagePointId !== targetStoragePoint.id) {
              throw new BadRequestException(
                `This area is not on the target storage point`,
              );
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
      });

      return {
        sourceStoragePoint,
        targetStoragePoint,
        mergeLocationsDto,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${MergeStoragePointsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }

  private _updateLocationItemsCost(
    productItem: ProductItem,
    location: Location,
  ): CurrencyMap[] {
    let itemsCost: CurrencyMap[];

    // const costs = productItem.purchaseCost.values;
    // costs.forEach((cost) => {
    //   const { code, value } = cost;
    //   itemsCost = location.stockValue.map((itemCost) => {
    //     if (itemCost.code === code) {
    //       itemCost.value = itemCost.value + value;

    //       return itemCost;
    //     }
    //   });
    // });

    return itemsCost;
  }
}
