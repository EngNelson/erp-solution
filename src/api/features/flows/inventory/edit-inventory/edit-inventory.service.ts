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
import { EditInventoryInput } from './dto';

type ValidationResult = {
  inventory: Inventory;
  location: Location;
  isNewLocation: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditInventoryService {
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
  ) {}

  async editInventory(
    input: EditInventoryInput,
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
    input: EditInventoryInput,
    result: ValidationResult,
  ): Promise<InventoryItemOutput> {
    try {
      const { inventory, location, isNewLocation, lang, user } = result;

      if (input.title) {
        for (const key in input.title) {
          inventory.title[key] = input.title[key];
        }
      }

      if (isNewLocation) {
        inventory.location = location;
        inventory.locationId = location.id;
      }

      inventory.updatedBy = user;

      await this._inventoryRepository.save(inventory);

      const inventoryModel: InventoryModel = { inventory };

      return new InventoryItemOutput(inventoryModel, lang);
    } catch (error) {
      throw new ConflictException(
        `${EditInventoryService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditInventoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const inventory = await this._inventoryRepository.findOne(
        input.inventoryId,
        { relations: ['location'] },
      );
      if (!inventory) {
        throw new NotFoundException(`Inventory to edit not found`);
      }

      /**
       * Cannot edit PENDING, VALIDATED or CANCELED inventory
       */
      if (inventory.status !== OperationStatus.SAVED) {
        throw new BadRequestException(
          `Cannot edit ${inventory.status} inventory`,
        );
      }

      let location: Location;
      if (!isNullOrWhiteSpace(input.locationId)) {
        location = await this._locationRepository.findOne(input.locationId);
        if (!location) {
          throw new NotFoundException(
            `The new location you provide is not found`,
          );
        }

        /**
         * If the user is in the current storage point ?
         */
        const locationAncestors =
          await this._locationTreeRepository.findAncestors(location);
        const parentLocation = locationAncestors.find(
          (location) => !isNullOrWhiteSpace(location.areaId),
        );
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
            `Sorry you cannot edit an inventory in '${storagePoint.name}' storage point because you belong to '${user.workStation.warehouse.name}'.`,
          );
        }
      }

      return { inventory, location, isNewLocation: !!location, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${EditInventoryService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
