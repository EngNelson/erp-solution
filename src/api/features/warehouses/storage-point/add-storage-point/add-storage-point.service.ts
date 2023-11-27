import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AddressUsage,
  StoragePointType,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import { ISOLang } from '@glosuite/shared';
import { Address } from 'src/domain/entities/shared';
import { AddStoragePointInput } from './dto';
import { StoragePointItemOutput } from 'src/domain/dto/warehouses';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { AddressRepository } from 'src/repositories/shared';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
} from 'src/domain/enums/warehouses';
import { LocationBarcodeService } from 'src/services/generals';
import {
  AreaReferenceService,
  LocationReferenceService,
  WarehouseReferenceService,
} from 'src/services/references/warehouses';
import { HttpService } from '@nestjs/axios';
import { STORAGE_POINT_RESOURCE } from 'src/domain/constants/public.constants';

type ValidationResult = {
  address: Address;
  isNewAddress: boolean;
  user: UserCon;
  lang: ISOLang;
};

@Injectable()
export class AddStoragePointService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    private readonly _httpService: HttpService,
    private readonly _locationBarcodeService: LocationBarcodeService,
    private readonly _locationReferenceService: LocationReferenceService,
    private readonly _areaReferenceService: AreaReferenceService,
    private readonly _warehouseReferenceService: WarehouseReferenceService,
  ) {}

  async addStoragePoint(
    input: AddStoragePointInput,
    user: UserCon,
    accessToken: string,
  ): Promise<StoragePointItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      input,
      validationResult,
      accessToken,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddStoragePointInput,
    result: ValidationResult,
    accessToken,
  ): Promise<StoragePointItemOutput> {
    const storagePoint = new StoragePoint();

    try {
      const { address, isNewAddress, user, lang } = result;

      storagePoint.reference = await this._warehouseReferenceService.generate();
      console.log(storagePoint.reference);

      storagePoint.space = input.space ? input.space : null;
      storagePoint.surface = input.space
        ? input.space.width * input.space.length
        : null;
      storagePoint.volume =
        input.space && input.space.height
          ? storagePoint.surface * input.space.height
          : null;

      storagePoint.name = input.name;
      storagePoint.description = input.description;
      storagePoint.allowSales = input.allowSales;
      storagePoint.allowVirtualZones = input.allowVirtualZones;
      storagePoint.status = input.status;
      storagePoint.address = address;
      storagePoint.addressId = address.id;
      if (input.isPrimary && input.isPrimary === 1) {
        storagePoint.isPrimary = input.isPrimary;
        const storagePoints = await this._storagePointRepository.find({
          where: { isPrimary: 1 },
          relations: ['address'],
        });
        const storagePointToEdit = storagePoints.find(
          (wh) => wh.address.city.name === storagePoint.address.city.name,
        );
        if (storagePointToEdit) {
          storagePointToEdit.isPrimary = 0;

          await this._storagePointRepository.save(storagePointToEdit);
        }
      }
      storagePoint.storageType = input.storageType;
      storagePoint.createdBy = user;

      await this._storagePointRepository.save(storagePoint);

      /**
       * Add Default Areas and Locations
       */

      // 1. default DEAD_STOCK area and location
      const defaultDeadStockArea = new Area();
      defaultDeadStockArea.reference =
        await this._areaReferenceService.generate();
      defaultDeadStockArea.type = AreaType.DEFAULT;
      defaultDeadStockArea.defaultType = AreaDefaultType.DEAD_STOCK;
      defaultDeadStockArea.title = `${storagePoint.name} - Dead stock`;
      defaultDeadStockArea.description = {
        fr: `Zone de stock mort de ${storagePoint.name}: stocks avaries, defectueux, etc...`,
        en: `Dead stock area of ${storagePoint.name}: damaged, defective stocks, etc...`,
      };
      defaultDeadStockArea.storagePoint = storagePoint;
      defaultDeadStockArea.storagePointId = storagePoint.id;

      await this._areaRepository.save(defaultDeadStockArea);

      // Location
      const defaultDeadStockLocation = new Location();
      defaultDeadStockLocation.reference =
        await this._locationReferenceService.generate();
      defaultDeadStockLocation.type = AreaType.DEFAULT;
      defaultDeadStockLocation.defaultType = LocationDefaultType.DEAD_STOCK;
      defaultDeadStockLocation.barCode =
        await this._locationBarcodeService.generate();
      defaultDeadStockLocation.name = `${storagePoint.name} - Dead stock`;
      defaultDeadStockLocation.description = {
        fr: `Emplacement de stock mort de la zone de stock mort de l'entrepot ${storagePoint.name}`,
        en: `Default dead stock location of dead stock area in ${storagePoint.name} warehouse`,
      };
      defaultDeadStockLocation.area = defaultDeadStockArea;
      defaultDeadStockLocation.areaId = defaultDeadStockArea.id;

      await this._locationRepository.save(defaultDeadStockLocation);

      // 2. Default RECEPTION area and locations
      if (input.addDefaultReceptionArea) {
        const defaultReceptionArea = new Area();
        defaultReceptionArea.reference =
          await this._areaReferenceService.generate();
        defaultReceptionArea.type = AreaType.DEFAULT;
        defaultReceptionArea.defaultType = AreaDefaultType.RECEPTION;
        defaultReceptionArea.title = `${storagePoint.name} - Reception`;
        defaultReceptionArea.description = {
          fr: `Zone de reception de ${storagePoint.name}`,
          en: `${storagePoint.name} reception area`,
        };
        defaultReceptionArea.storagePoint = storagePoint;
        defaultReceptionArea.storagePointId = storagePoint.id;

        await this._areaRepository.save(defaultReceptionArea);

        // Locations
        const defaultSAVLocation = new Location();
        defaultSAVLocation.reference =
          await this._locationReferenceService.generate();
        defaultSAVLocation.type = AreaType.DEFAULT;
        defaultSAVLocation.defaultType = LocationDefaultType.SAV;
        defaultSAVLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultSAVLocation.name = `${storagePoint.name} - SAV`;
        defaultSAVLocation.description = {
          fr: `Emplacement SAV de la zone de reception dans l'entrepot ${storagePoint.name}`,
          en: `Default SAV location of reception area in ${storagePoint.name} warehouse`,
        };
        defaultSAVLocation.area = defaultReceptionArea;
        defaultSAVLocation.areaId = defaultReceptionArea.id;

        await this._locationRepository.save(defaultSAVLocation);

        const defaultReceptionLocation = new Location();
        defaultReceptionLocation.reference =
          await this._locationReferenceService.generate();
        defaultReceptionLocation.type = AreaType.DEFAULT;
        defaultReceptionLocation.defaultType = LocationDefaultType.RECEPTION;
        defaultReceptionLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultReceptionLocation.name = `${storagePoint.name} - Reception`;
        defaultReceptionLocation.description = {
          fr: `Emplacement de reception de la zone de reception dans l'entrepot ${storagePoint.name}`,
          en: `Default Reception location of reception area in ${storagePoint.name} warehouse`,
        };
        defaultReceptionLocation.area = defaultReceptionArea;
        defaultReceptionLocation.areaId = defaultReceptionArea.id;

        await this._locationRepository.save(defaultReceptionLocation);
      }

      // 3. Default AWAINTING_SAV area and location
      if (input.addDefaultAwaitingSAVArea) {
        // Area
        const defaultAwaitingSAVArea = new Area();
        defaultAwaitingSAVArea.reference =
          await this._areaReferenceService.generate();
        defaultAwaitingSAVArea.type = AreaType.DEFAULT;
        defaultAwaitingSAVArea.defaultType = AreaDefaultType.AWAITING_SAV;
        defaultAwaitingSAVArea.title = `${storagePoint.name} - Awaiting SAV`;
        defaultAwaitingSAVArea.description = {
          fr: `Zone SAV en attente de l'entrepot ${storagePoint.name}`,
          en: `Awaiting SAV area of ${storagePoint.name} warehouse`,
        };
        defaultAwaitingSAVArea.storagePoint = storagePoint;
        defaultAwaitingSAVArea.storagePointId = storagePoint.id;

        await this._areaRepository.save(defaultAwaitingSAVArea);

        // Location
        const defaultAwaitingSAVLocation = new Location();
        defaultAwaitingSAVLocation.reference =
          await this._locationReferenceService.generate();
        defaultAwaitingSAVLocation.type = AreaType.DEFAULT;
        defaultAwaitingSAVLocation.defaultType =
          LocationDefaultType.AWAITING_SAV;
        defaultAwaitingSAVLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultAwaitingSAVLocation.name = `${storagePoint.name} - Awaiting SAV`;
        defaultAwaitingSAVLocation.description = {
          fr: `Emplacement SAV en attente de la zone SAV en attente l'entrepot ${storagePoint.name}`,
          en: `Default Awaiting SAV location of Awaiting SAV area in ${storagePoint.name} warehouse`,
        };
        defaultAwaitingSAVLocation.area = defaultAwaitingSAVArea;
        defaultAwaitingSAVLocation.areaId = defaultAwaitingSAVArea.id;

        await this._locationRepository.save(defaultAwaitingSAVLocation);
      }

      // 4. Default PREPARATION area and location
      if (input.addDefaultPreparationArea) {
        // Area
        const defaultPreparationArea = new Area();
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

        // Location
        const defaultPreparationLocation = new Location();
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

      // 5. Default DEPOT_VENTE area and location
      if (input.addDefaultDepotVenteArea) {
        // Area
        const defaultDepotVenteArea = new Area();
        defaultDepotVenteArea.reference =
          await this._areaReferenceService.generate();
        defaultDepotVenteArea.type = AreaType.DEFAULT;
        defaultDepotVenteArea.defaultType = AreaDefaultType.DEPOT_VENTE;
        defaultDepotVenteArea.title = `${storagePoint.name} - Depot vente`;
        defaultDepotVenteArea.description = {
          fr: `Zone depot vente de l'entrepot ${storagePoint.name}`,
          en: `Depot vente area of ${storagePoint.name}`,
        };
        defaultDepotVenteArea.storagePoint = storagePoint;
        defaultDepotVenteArea.storagePointId = storagePoint.id;

        await this._areaRepository.save(defaultDepotVenteArea);

        // Location
        const defaultDepotVenteLocation = new Location();
        defaultDepotVenteLocation.reference =
          await this._locationReferenceService.generate();
        defaultDepotVenteLocation.type = AreaType.DEFAULT;
        defaultDepotVenteLocation.defaultType = LocationDefaultType.DEPOT_VENTE;
        defaultDepotVenteLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultDepotVenteLocation.name = `${storagePoint.name} - Depot vente`;
        defaultDepotVenteLocation.description = {
          fr: `Emplacement Depot vente de la zone depot vente de l'entrepot ${storagePoint.name}`,
          en: `Default Depot vente location of depot vente area in ${storagePoint.name} warehouse`,
        };
        defaultDepotVenteLocation.area = defaultDepotVenteArea;
        defaultDepotVenteLocation.areaId = defaultDepotVenteArea.id;

        await this._locationRepository.save(defaultDepotVenteLocation);
      }

      // 6. Default OUTPUT area and locations
      if (input.addDefaultOutputArea) {
        // Area
        const defaultOutputArea = new Area();
        defaultOutputArea.reference =
          await this._areaReferenceService.generate();
        defaultOutputArea.type = AreaType.DEFAULT;
        defaultOutputArea.defaultType = AreaDefaultType.OUTPUT;
        defaultOutputArea.title = `${storagePoint.name} - Output`;
        defaultOutputArea.description = {
          fr: `Zone de sortie de l'entreptot ${storagePoint.name}`,
          en: `Output area of ${storagePoint.name} warehouse`,
        };
        defaultOutputArea.storagePoint = storagePoint;
        defaultOutputArea.storagePointId = storagePoint.id;

        await this._areaRepository.save(defaultOutputArea);

        /**
         * Locations
         * 1. PUS
         * 2. FLEET
         * 3. EXPEDITION
         * 4. INTERNAL_NEED
         */
        const defaultPUSLocation = new Location();
        defaultPUSLocation.reference =
          await this._locationReferenceService.generate();
        defaultPUSLocation.type = AreaType.DEFAULT;
        defaultPUSLocation.defaultType = LocationDefaultType.PUS;
        defaultPUSLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultPUSLocation.name = `${storagePoint.name} - PUS`;
        defaultPUSLocation.description = {
          fr: `Emplacement PUS de la zone output de l'entrepot ${storagePoint.name}`,
          en: `PUS location of the output area in ${storagePoint.name}`,
        };
        defaultPUSLocation.area = defaultOutputArea;
        defaultPUSLocation.areaId = defaultOutputArea.id;

        await this._locationRepository.save(defaultPUSLocation);

        const defaultFLEETLocation = new Location();
        defaultFLEETLocation.reference =
          await this._locationReferenceService.generate();
        defaultFLEETLocation.type = AreaType.DEFAULT;
        defaultFLEETLocation.defaultType = LocationDefaultType.FLEET;
        defaultFLEETLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultFLEETLocation.name = `${storagePoint.name} - FLEET`;
        defaultFLEETLocation.description = {
          fr: `Emplacement FLEET de a zone de sortie de l'entrepot ${storagePoint.name}`,
          en: `FLEET location of the output area in ${storagePoint.name}`,
        };
        defaultFLEETLocation.area = defaultOutputArea;
        defaultFLEETLocation.areaId = defaultOutputArea.id;

        await this._locationRepository.save(defaultFLEETLocation);

        const defaultExpeditionLocation = new Location();
        defaultExpeditionLocation.reference =
          await this._locationReferenceService.generate();
        defaultExpeditionLocation.type = AreaType.DEFAULT;
        defaultExpeditionLocation.defaultType = LocationDefaultType.EXPEDITION;
        defaultExpeditionLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultExpeditionLocation.name = `${storagePoint.name} - Expedition`;
        defaultExpeditionLocation.description = {
          fr: `Emplacement Expedition de la zone de sortie de l'entrepot ${storagePoint.name}`,
          en: `Expedition location of the output area in ${storagePoint.name}`,
        };
        defaultExpeditionLocation.area = defaultOutputArea;
        defaultExpeditionLocation.areaId = defaultOutputArea.id;

        await this._locationRepository.save(defaultExpeditionLocation);

        const defaultInternalNeedLocation = new Location();
        defaultInternalNeedLocation.reference =
          await this._locationReferenceService.generate();
        defaultInternalNeedLocation.type = AreaType.DEFAULT;
        defaultInternalNeedLocation.defaultType =
          LocationDefaultType.INTERNAL_NEED;
        defaultInternalNeedLocation.barCode =
          await this._locationBarcodeService.generate();
        defaultInternalNeedLocation.name = `${storagePoint.name} - Internal need`;
        defaultInternalNeedLocation.description = {
          fr: `Emplacement besoins internes de la zone de sortie de l'entrepot ${storagePoint.name}`,
          en: `Internal needs location of the output area in ${storagePoint.name}`,
        };
        defaultInternalNeedLocation.area = defaultOutputArea;
        defaultInternalNeedLocation.areaId = defaultOutputArea.id;

        await this._locationRepository.save(defaultInternalNeedLocation);
      }

      /**
       * Save new datas on auth
       */
      const { id, createdAt, lastUpdate, deletedAt, ...storagePointDatas } =
        storagePoint;

      const path = `${process.env.AUTH_API_PATH}/${STORAGE_POINT_RESOURCE}`;

      console.log('AUTH ENDPOINT ', path);

      await this._httpService.axiosRef
        .post(path, storagePointDatas, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        })
        .then((response) => {
          console.log(
            `${response.config.method} on ${response.config.url}. Ref=${
              storagePointDatas.reference + ' - Name=' + storagePointDatas.name
            }, Result=${response.statusText}`,
          );
        })
        .catch((error) => {
          throw new HttpException(
            error.message,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        });

      return new StoragePointItemOutput(storagePoint, lang);
    } catch (error) {
      console.log(error);

      if (storagePoint.id) {
        await this._storagePointRepository.delete(storagePoint.id);
      }
      throw new ConflictException(
        `${AddStoragePointService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddStoragePointInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      // if (Number.isNaN(input.priority) || input.priority < 0) {
      //   throw new HttpException(
      //     `Invalid fields: priority ${input.priority}`,
      //     HttpStatus.BAD_REQUEST,
      //   );
      // }

      // if (
      //   !input.locationKeywords ||
      //   isNullOrWhiteSpace(input.locationKeywords)
      // ) {
      //   throw new BadRequestException(
      //     `Please provide a location keywords for this warehouse`,
      //   );
      // }

      const isNewAddress = !(
        input.addressId && input.addressId.trim().length > 0
      );
      let address: Address;

      if (isNewAddress) {
        if (!input.address) {
          throw new BadRequestException(`Invalid address provided`);
        }

        const {
          postalCode,
          positionRef,
          positions,
          street,
          quarter,
          city,
          region,
          country,
        } = input.address;

        address = new Address();

        address.usage = AddressUsage.WAREHOUSES_USAGE;
        address.postalCode = postalCode;
        address.positionRef = positionRef;
        address.positions = positions;
        address.street = street;
        address.quarter = quarter;
        address.city = city;
        address.region = region;
        address.country = country;
        address.createdBy = user;

        await this._addressRepository.save(address);
      } else {
        address = await this._addressRepository.findOne({
          where: {
            id: input.addressId,
          },
        });
        if (!address) {
          throw new NotFoundException(
            `Address with id '${input.addressId}' not found`,
          );
        }
      }

      /**
       * Priority verification
       */
      // const storagePoints = await this._storagePointRepository.find({
      //   relations: ['address'],
      // });

      // if (storagePoints && storagePoints.length > 0) {
      //   if (
      //     storagePoints.find(
      //       (storagePoint) =>
      //         storagePoint.address.city.name === address.city.name &&
      //         storagePoint.priority === input.priority,
      //     )
      //   ) {
      //     throw new BadRequestException(`Check the current priority value`);
      //   }
      // }

      /**
       * Default areas and locations validations
       */
      if (
        input.addDefaultReceptionArea ||
        input.addDefaultPreparationArea ||
        input.addDefaultDepotVenteArea ||
        input.addDefaultOutputArea
      ) {
        if (
          input.storageType !== StoragePointType.WAREHOUSE &&
          input.storageType !== StoragePointType.MAGASIN
        ) {
          throw new BadRequestException(
            `Cannot create default ${AreaDefaultType.RECEPTION} or ${AreaDefaultType.PREPARATION} or ${AreaDefaultType.DEPOT_VENTE} or ${AreaDefaultType.OUTPUT} for ${input.storageType} storage type`,
          );
        }
      }

      if (input.isPrimary) {
        if (Number.isNaN(input.isPrimary) || input.isPrimary < 0) {
          throw new HttpException(
            `Invalid fields: isPrimary ${input.isPrimary}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return { address, isNewAddress, user, lang };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddStoragePointService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
