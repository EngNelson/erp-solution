import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
} from 'src/domain/enums/warehouses';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import {
  AreaReferenceService,
  LocationReferenceService,
} from '../references/warehouses';
import { LocationBarcodeService } from './location-barcode.service';

@Injectable()
export class StoragePointService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    private readonly _areaReferenceService: AreaReferenceService,
    private readonly _locationReferenceService: LocationReferenceService,
    private readonly _locationBarcodeService: LocationBarcodeService,
  ) {}

  async getStoragePointLocations(
    storagePoint: StoragePoint,
  ): Promise<Location[]> {
    try {
      const locations: Location[] = [];
      const areas = await this._areaRepository.find({
        where: { storagePointId: storagePoint.id },
        relations: ['locations'],
      });

      await Promise.all(
        areas.map(async (area) => {
          locations.push(...area.locations);

          await Promise.all(
            area.locations?.map(async (location) => {
              const children =
                await this._locationTreeRepository.findDescendants(location);

              locations.push(...children);
            }),
          );
        }),
      );

      return locations;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured: ${error.message}`,
      );
    }
  }

  async getOrCreateStoragePointDefaultSavLocation(
    storagePoint: StoragePoint,
  ): Promise<Location> {
    try {
      let defaultSavLocation: Location;

      let defaultSavArea = await this._areaRepository.findOne({
        where: {
          storagePointId: storagePoint.id,
          type: AreaType.DEFAULT,
          defaultType: AreaDefaultType.AWAITING_SAV,
        },
      });

      if (defaultSavArea) {
        defaultSavLocation = await this._locationRepository.findOne({
          where: {
            areaId: defaultSavArea.id,
            type: AreaType.DEFAULT,
            defaultType: LocationDefaultType.SAV,
          },
        });
      }

      if (!defaultSavArea) {
        // Create defaultSavArea
        defaultSavArea = new Area();

        defaultSavArea.reference = await this._areaReferenceService.generate();
        defaultSavArea.type = AreaType.DEFAULT;
        defaultSavArea.defaultType = AreaDefaultType.AWAITING_SAV;
        defaultSavArea.title = `${storagePoint.name} - Awaiting SAV`;
        defaultSavArea.description = {
          fr: `Zone SAV en attente de l'entrepot ${storagePoint.name}`,
          en: `Awaiting SAV area of ${storagePoint.name} warehouse`,
        };
        defaultSavArea.storagePointId = storagePoint.id;
        defaultSavArea.storagePoint = storagePoint;

        await this._areaRepository.save(defaultSavArea);
      }

      if (!defaultSavLocation) {
        // Create defaultAwaitingLocation
        defaultSavLocation = new Location();

        defaultSavLocation.reference =
          await this._locationReferenceService.generate();
        defaultSavLocation.type = AreaType.DEFAULT;
        defaultSavLocation.defaultType = LocationDefaultType.AWAITING_SAV;
        defaultSavLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultSavLocation.name = `${storagePoint.name} - Awaiting SAV`;
        defaultSavLocation.description = {
          fr: `Emplacement SAV en attente de la zone SAV en attente l'entrepot ${storagePoint.name}`,
          en: `Default Awaiting SAV location of Awaiting SAV area in ${storagePoint.name} warehouse`,
        };
        defaultSavLocation.area = defaultSavArea;
        defaultSavLocation.areaId = defaultSavArea.id;

        await this._locationRepository.save(defaultSavLocation);
      }

      return defaultSavLocation;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured: ${error.message}`,
      );
    }
  }

  async getOrCreateStoragePointDefaultReceptionLocation(
    storagePoint: StoragePoint,
  ): Promise<Location> {
    try {
      let defaultReceptionLocation: Location;

      let defaultReceptionArea = await this._areaRepository.findOne({
        where: {
          storagePointId: storagePoint.id,
          type: AreaType.DEFAULT,
          defaultType: AreaDefaultType.RECEPTION,
        },
      });

      if (defaultReceptionArea) {
        defaultReceptionLocation = await this._locationRepository.findOne({
          where: {
            areaId: defaultReceptionArea.id,
            type: AreaType.DEFAULT,
            defaultType: LocationDefaultType.RECEPTION,
          },
        });
      }

      if (!defaultReceptionArea) {
        // Create defaultReceptionArea
        defaultReceptionArea = new Area();

        defaultReceptionArea.reference =
          await this._areaReferenceService.generate();
        defaultReceptionArea.type = AreaType.DEFAULT;
        defaultReceptionArea.defaultType = AreaDefaultType.RECEPTION;
        defaultReceptionArea.title = `${storagePoint.name} - Reception`;
        defaultReceptionArea.description = {
          fr: `Zone de reception de ${storagePoint.name}`,
          en: `${storagePoint.name} reception area`,
        };
        defaultReceptionArea.storagePointId = storagePoint.id;
        defaultReceptionArea.storagePoint = storagePoint;

        await this._areaRepository.save(defaultReceptionArea);
      }

      if (!defaultReceptionLocation) {
        // Create defaultReceptionLocation
        defaultReceptionLocation = new Location();

        defaultReceptionLocation.reference =
          await this._locationReferenceService.generate();
        defaultReceptionLocation.type = AreaType.DEFAULT;
        defaultReceptionLocation.defaultType = LocationDefaultType.AWAITING_SAV;
        defaultReceptionLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultReceptionLocation.name = `${storagePoint.name} - Awaiting SAV`;
        defaultReceptionLocation.description = {
          fr: `Emplacement de reception de la zone de reception dans l'entrepot ${storagePoint.name}`,
          en: `Default Reception location of reception area in ${storagePoint.name} warehouse`,
        };
        defaultReceptionLocation.area = defaultReceptionArea;
        defaultReceptionLocation.areaId = defaultReceptionArea.id;

        await this._locationRepository.save(defaultReceptionLocation);
      }

      return defaultReceptionLocation;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured: ${error.message}`,
      );
    }
  }

  async getOrCreateStoragePointDefaultPreparationLocation(
    storagePoint: StoragePoint,
  ): Promise<Location> {
    try {
      let defaultPreparationLocation: Location;

      let defaultPreparationArea = await this._areaRepository.findOne({
        where: {
          storagePointId: storagePoint.id,
          type: AreaType.DEFAULT,
          defaultType: AreaDefaultType.PREPARATION,
        },
      });

      if (defaultPreparationArea) {
        defaultPreparationLocation = await this._locationRepository.findOne({
          where: {
            areaId: defaultPreparationArea.id,
            type: AreaType.DEFAULT,
            defaultType: LocationDefaultType.PREPARATION,
          },
        });
      }

      if (!defaultPreparationArea) {
        defaultPreparationArea = new Area();
        defaultPreparationArea.reference =
          await this._areaReferenceService.generate();
        defaultPreparationArea.type = AreaType.DEFAULT;
        defaultPreparationArea.defaultType = AreaDefaultType.PREPARATION;
        defaultPreparationArea.title = `${storagePoint.name} - Preparation`;
        defaultPreparationArea.description = {
          fr: `Zone de preparation de l'entrepot ${storagePoint.name}`,
          en: `Preparation area of ${storagePoint.name} warehouse`,
        };
        defaultPreparationArea.storagePoint = storagePoint;
        defaultPreparationArea.storagePointId = storagePoint.id;

        await this._areaRepository.save(defaultPreparationArea);
      }

      if (!defaultPreparationLocation) {
        defaultPreparationLocation = new Location();
        defaultPreparationLocation.reference =
          await this._locationReferenceService.generate();
        defaultPreparationLocation.type = AreaType.DEFAULT;
        defaultPreparationLocation.defaultType =
          LocationDefaultType.PREPARATION;
        defaultPreparationLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultPreparationLocation.name = `${storagePoint.name} - Preparation`;
        defaultPreparationLocation.description = {
          fr: `Emplacement de preparation de la zone de preparation de l'entrepot ${storagePoint.name}`,
          en: `Default preparation location of preparation area in ${storagePoint.name} warehouse`,
        };
        defaultPreparationLocation.area = defaultPreparationArea;
        defaultPreparationLocation.areaId = defaultPreparationArea.id;

        await this._locationRepository.save(defaultPreparationLocation);
      }

      return defaultPreparationLocation;
    } catch (error) {
      throw new InternalServerErrorException(
        `${StoragePointService.name} - ${this.getOrCreateStoragePointDefaultPreparationLocation.name} - ` +
          error.message,
      );
    }
  }
}
