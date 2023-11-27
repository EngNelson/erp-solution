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

import { MergeLocationsInput } from './dto';
import { DeleteLocationInput } from '../delete-location/dto';
import { DeleteLocationService } from '../delete-location/delete-location.service';
import { GetLocationTreeByIdService } from '../get-location-tree-by-id/get-location-tree-by-id.service';
import { GetLocationTreeByIdInput } from '../get-location-tree-by-id/dto';
import { LocationTreeOutput } from 'src/domain/dto/warehouses';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { Area, Location } from 'src/domain/entities/warehouses';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';
import { AreaType } from 'src/domain/enums/warehouses';
import {
  BuildMergeLocationsMappingService,
  LocationBarcodeService,
} from 'src/services/generals';
import { LocationReferenceService } from 'src/services/references/warehouses';

type ValidationResult = {
  sourceLocation: Location;
  targetLocation: Location;
  mergeLocationsDto: MergeLocationsMapping[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class MergeLocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _buildMergeLocationsMappingService: BuildMergeLocationsMappingService,
    private readonly _locationReferenceService: LocationReferenceService,
    private readonly _locationBarcodeService: LocationBarcodeService,
    private readonly _deleteLocationService: DeleteLocationService,
    private readonly _getLocationTreeService: GetLocationTreeByIdService,
  ) {}

  async mergeLocations(
    input: MergeLocationsInput,
    user: UserCon,
  ): Promise<LocationTreeOutput> {
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
  ): Promise<LocationTreeOutput> {
    try {
      const { sourceLocation, targetLocation, mergeLocationsDto, lang, user } =
        result;

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
          }

          await this._productItemRepository.save(productItemsToMove);
        }
      });

      /**
       * Delete all locations from source location
       * And then delete the source location itself
       */
      const inputDeleteLocation: DeleteLocationInput = {
        locationId: sourceLocation.id,
      };
      await this._deleteLocationService.deleteLocation(
        inputDeleteLocation,
        user,
      );

      /**
       * construction of the output
       */
      const inputLocationOutput: GetLocationTreeByIdInput = {
        locationId: targetLocation.id,
        lang,
      };
      const locationOutput =
        await this._getLocationTreeService.getLocationTreeById(
          inputLocationOutput,
          user,
        );

      return locationOutput;
    } catch (error) {
      throw new BadRequestException(
        `${MergeLocationsService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: MergeLocationsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
      const { sourceLocationId, targetLocationId, mergeLocationsMapping } =
        input;

      /**
       * Get source and target locations
       */
      const sourceLocation = await this._locationRepository.findOne({
        where: {
          id: sourceLocationId,
        },
      });
      if (!sourceLocation) {
        throw new NotFoundException(`The location to move not found`);
      }

      const targetLocation = await this._locationRepository.findOne({
        where: {
          id: targetLocationId,
        },
      });
      if (!targetLocation) {
        throw new NotFoundException(`The target location not found`);
      }

      if (
        sourceLocation.type === AreaType.DEFAULT ||
        targetLocation.type === AreaType.DEFAULT
      ) {
        throw new BadRequestException(
          `You cannot merge ${AreaType.DEFAULT} locations`,
        );
      }

      /**
       * Check if source and target locations are in the same storage point
       */
      const sourceParents = await this._locationTreeRepository.findAncestors(
        sourceLocation,
      );
      const targetParents = await this._locationTreeRepository.findAncestors(
        targetLocation,
      );

      const sourceRoot = sourceParents.find(
        (parent) => !!parent.areaId === true,
      );
      const targetRoot = targetParents.find(
        (parent) => !!parent.areaId === true,
      );

      if (!sourceRoot || !targetRoot) {
        throw new BadRequestException(
          `Cannot find location root of the source or target location`,
        );
      }

      const sourceArea = await this._areaRepository.findOne({
        where: {
          id: sourceRoot.areaId,
        },
      });
      if (!sourceArea) {
        throw new BadRequestException(`the source location is not in an area`);
      }

      const targetArea = await this._areaRepository.findOne({
        where: {
          id: targetRoot.areaId,
        },
      });
      if (!targetArea) {
        throw new BadRequestException(`the target location is not in an area`);
      }

      if (sourceArea.storagePointId !== targetArea.storagePointId) {
        throw new BadRequestException(
          `Merge cannot be performed because the source and target are not in the same storage point`,
        );
      }

      /**
       * Recuperer tous les sous emplacements de l'emplacement source
       * et verifier qu'ils sont tous present dans le tableau
       * mergeLocationsMapping
       */
      const sourceLocationsToMerge =
        await this._locationTreeRepository.findDescendants(sourceLocation);

      const isEachLocationFromSourcePresentOnMapping =
        sourceLocationsToMerge.some(
          (sourceLoc) =>
            sourceLoc.totalItems > 0 &&
            mergeLocationsMapping.some(
              (mergeItem) => sourceLoc.id !== mergeItem.locationSourceId,
            ),
        );

      if (isEachLocationFromSourcePresentOnMapping) {
        throw new UnauthorizedException(
          `Merge cannot be performed because some locations with products have not been moved to the new location`,
        );
      }

      /**
       * Construire le tableau mergeLocationsMapping
       */
      const mergeLocationsDto =
        await this._buildMergeLocationsMappingService.build(
          mergeLocationsMapping,
          false,
          true,
          null,
          targetLocation,
        );

      return { sourceLocation, targetLocation, mergeLocationsDto, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${MergeLocationsService.name} - ${this._tryValidation.name}`,
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
