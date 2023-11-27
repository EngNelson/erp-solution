import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { InventoryItemOutput } from 'src/domain/dto/flows';
import { Inventory } from 'src/domain/entities/flows';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { OperationStatus } from 'src/domain/enums/flows';
import { InventoryModel } from 'src/domain/interfaces/flows';
import { InventoryRepository } from 'src/repositories/flows';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { InventoryReferenceService } from 'src/services/references/flows';
import { AddInventoryInput } from './dto';
import { AreaType, LocationDefaultType } from 'src/domain/enums/warehouses';

type ValidationResult = {
  location: Location;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddInventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _inventoryReferenceService: InventoryReferenceService,
  ) {}

  async addInventory(
    input: AddInventoryInput,
    user: UserCon,
  ): Promise<InventoryItemOutput> {
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
    input: AddInventoryInput,
    result: ValidationResult,
  ): Promise<InventoryItemOutput> {
    const inventory = new Inventory();

    try {
      const { location, lang, user } = result;

      inventory.reference = await this._inventoryReferenceService.generate();
      inventory.title = input.title;
      inventory.status = OperationStatus.SAVED;
      inventory.location = location;
      inventory.locationId = location.id;
      inventory.createdBy = user;

      await this._inventoryRepository.save(inventory);

      const inventoryModel: InventoryModel = {
        inventory,
      };

      return new InventoryItemOutput(inventoryModel, lang);
    } catch (error) {
      if (inventory.id) {
        await this._inventoryRepository.delete(inventory.id);
      }
      throw new ConflictException(
        `${AddInventoryService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddInventoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const location = await this._locationRepository.findOne(input.locationId);

      if (!location) {
        throw new NotFoundException(`Location not found.`);
      }

      /**
       * If the user is in the current storage point ?
       */
      const locationAncestors =
        await this._locationTreeRepository.findAncestors(location);
      const parentLocation = locationAncestors.find(
        (location) => !isNullOrWhiteSpace(location.areaId),
      );

      // Cannot start inventory on INVESTIGATION location
      if (
        parentLocation.type === AreaType.DEFAULT &&
        parentLocation.defaultType === LocationDefaultType.INVESTIGATION
      ) {
        throw new BadRequestException(
          `You cannot start inventory on investigation location`,
        );
      }

      const area = await this._areaRepository.findOne(parentLocation.areaId);
      const storagePoint = await this._storagePointRepository.findOne(
        area.storagePointId,
      );

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.WAREHOUSE_MANAGER,
        ) &&
        user.workStation.warehouse.reference !== storagePoint.reference
      ) {
        throw new UnauthorizedException(
          `Sorry you cannot create an inventory in '${storagePoint.name}' storage point because you belong to '${user.workStation.warehouse.name}'.`,
        );
      }

      return { location, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${AddInventoryService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
