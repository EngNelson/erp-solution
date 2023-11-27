import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CurrencyMap, ISOLang, UserCon } from '@glosuite/shared';
import { MergeLocationsMapping } from 'src/domain/types';
import { DeleteAreaService } from '../delete-area/delete-area.service';
import { MergeAreasInput } from './dto';
import { DeleteAreaInput } from '../delete-area/dto';
import { AreaTreeOutput } from 'src/domain/dto/warehouses';
import { Area, Location } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';
import { AreaType } from 'src/domain/enums/warehouses';
import {
  BuildMergeLocationsMappingService,
  LocationBarcodeService,
} from 'src/services/generals';
import { LocationReferenceService } from 'src/services/references/warehouses';

type ValidationResult = {
  sourceArea: Area;
  targetArea: Area;
  mergeLocationsDto: MergeLocationsMapping[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class MergeAreasService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _locationReferenceService: LocationReferenceService,
    private readonly _locationBarcodeService: LocationBarcodeService,
    private readonly _deleteAreaService: DeleteAreaService,
    private readonly _buildMergeLocationsMappingService: BuildMergeLocationsMappingService,
  ) {}

  async mergeAreas(
    input: MergeAreasInput,
    user: UserCon,
  ): Promise<AreaTreeOutput> {
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
  ): Promise<AreaTreeOutput> {
    try {
      const { sourceArea, targetArea, mergeLocationsDto, lang, user } = result;

      // let productItemsEditedToEmit: ProductItem[];
      // let locationsCreatedToEmit: Location[];
      // let locationsEditedToEmit: Location[];

      mergeLocationsDto.forEach(async (mergeDto) => {
        const {
          sourceLocation,
          targetLocation,
          isNewLocation,
          newLocationInput,
        } = mergeDto;

        /**
         * Get all product items from source to move in the target location
         * or in the new created location
         */
        const productItemsToMove = await this._productItemRepository.find({
          where: { locationId: sourceLocation.id },
          relations: ['purchaseCost'],
        });

        if (productItemsToMove && productItemsToMove.length > 0) {
          if (isNewLocation) {
            const { name, description, parentLocation } = newLocationInput;

            /**
             * Create the new location on the target area
             */
            const newLocation = new Location();

            newLocation.reference =
              await this._locationReferenceService.generate();
            newLocation.name = name;
            newLocation.description = description;
            newLocation.barCode = await this._locationBarcodeService.generate();
            newLocation.parentLocation = parentLocation;

            newLocation.createdBy = user;

            await this._locationRepository.save(newLocation);

            /**
             * Move all product items to target location (newLocation)
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

              // locationsCreatedToEmit.push(newLocation);
            });
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

            // locationsEditedToEmit.push(targetLocation);
          }

          await this._productItemRepository.save(productItemsToMove);

          // productItemsEditedToEmit.push(...productItemsToMove);
        }
      });

      /**
       * Delete all locations from source area
       * And then delete the source area itself
       * emit deleted source area
       */
      const inputDeleteArea: DeleteAreaInput = { areaId: sourceArea.id };
      await this._deleteAreaService.deleteArea(inputDeleteArea, user);

      /**
       * construction of the output
       */
      const areOutput = await this._areaRepository.findOne({
        where: { id: targetArea.id },
        relations: ['locations'],
      });
      areOutput.locations.map(async (location) => {
        const children = await this._locationTreeRepository.findDescendantsTree(
          location,
        );
        location.children.push(children);
        return location;
      });

      return new AreaTreeOutput(areOutput, lang);
    } catch (error) {
      throw new BadRequestException(
        `${MergeAreasService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: MergeAreasInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
      const { sourceAreaId, targetAreaId, mergeLocationsMapping } = input;

      /**
       * Get source and target areas
       */
      const sourceArea = await this._areaRepository.findOne({
        where: { id: sourceAreaId },
        relations: ['locations'],
      });
      if (!sourceArea) {
        throw new NotFoundException(
          `The source area with id '${sourceAreaId}' not found`,
        );
      }

      const targetArea = await this._areaRepository.findOne({
        where: { id: targetAreaId },
        relations: ['locations'],
      });
      if (!targetArea) {
        throw new NotFoundException(
          `The target area with id '${targetAreaId}' not found`,
        );
      }

      /**
       * Check if the source or the target area is DEFAULT
       */
      if (
        sourceArea.type === AreaType.DEFAULT ||
        targetArea.type === AreaType.DEFAULT
      ) {
        throw new BadRequestException(
          `You cannot merge ${AreaType.DEFAULT} areas`,
        );
      }

      /**
       * Check if source and target areas are in the same storage point
       */
      if (sourceArea.storagePointId !== targetArea.storagePointId) {
        throw new BadRequestException(
          `Merge cannot be performed because the source and target are not in the same storage point`,
        );
      }

      /**
       * Recuperer tous les emplacements de la zone source
       * et verifier qu'ils sont tous present dans le tableau
       * mergeLocationsMapping
       */
      let sourceAreaLocations: Location[];
      await Promise.all(
        sourceArea.locations?.map(async (location) => {
          const children = await this._locationTreeRepository.findDescendants(
            location,
          );
          sourceAreaLocations.push(...children);
        }),
      );

      const isEachLocationFromSourcePresentOnMapping = sourceAreaLocations.some(
        (loc) =>
          loc.totalItems > 0 &&
          mergeLocationsMapping.some(
            (mergeLoc) => loc.id !== mergeLoc.locationSourceId,
          ),
      );

      if (!isEachLocationFromSourcePresentOnMapping) {
        throw new UnauthorizedException(
          `Merge cannot be performed because some locations with products have not been moved to the new area`,
        );
      }

      /**
       * Construire le tableau mergeLocationsMapping
       */
      const mergeLocationsDto =
        await this._buildMergeLocationsMappingService.build(
          mergeLocationsMapping,
          true,
          false,
          targetArea,
        );

      return { sourceArea, targetArea, mergeLocationsDto, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${MergeAreasService.name} - ${this._tryValidation.name}`,
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
