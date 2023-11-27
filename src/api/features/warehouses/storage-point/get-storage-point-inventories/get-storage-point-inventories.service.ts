import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { MiniInventoryOutput } from 'src/domain/dto/flows';
import { Inventory } from 'src/domain/entities/flows';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { OperationStatus } from 'src/domain/enums/flows';
import { InventoryRepository } from 'src/repositories/flows';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import {
  GetStoragePointInventoriesInput,
  GetStoragePointInventoriesOutput,
} from './dto';

type ValidationResult = {
  locations: Location[];
  lang?: ISOLang;
  status?: OperationStatus;
};

type WhereClause = {
  status?: OperationStatus;
  locationId?: string;
};

@Injectable()
export class GetStoragePointInventoriesService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async getStoragePointInventories(
    input: GetStoragePointInventoriesInput,
    user: UserCon,
  ): Promise<GetStoragePointInventoriesOutput> {
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
  ): Promise<GetStoragePointInventoriesOutput> {
    try {
      const { locations, lang, status } = result;

      const whereClause: WhereClause = {};
      if (status) whereClause.status = status;

      const allInventories: Inventory[] = [];
      await Promise.all(
        locations.map(async (location) => {
          whereClause.locationId = location.id;

          const inventories = await this._inventoryRepository.find({
            where: whereClause,
            relations: ['location'],
            order: { createdAt: 'DESC' },
          });

          allInventories.push(...inventories);
        }),
      );

      return new GetStoragePointInventoriesOutput(
        allInventories.map(
          (inventory) => new MiniInventoryOutput(inventory, lang),
        ),
        allInventories.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointInventoriesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetStoragePointInventoriesInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { status } = input.options;

      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const storagePoint = await this._storagePointRepository.findOne({
        where: { id: input.storagePointId },
        relations: ['areas'],
      });
      if (!storagePoint) {
        throw new NotFoundException(`Storage point not found`);
      }

      const locations: Location[] = [];
      await Promise.all(
        storagePoint.areas?.map(async (area) => {
          const areaDetails = await this._areaRepository.findOne({
            where: { id: area.id },
            relations: ['locations'],
          });

          await Promise.all(
            areaDetails.locations?.map(async (location) => {
              const children =
                await this._locationTreeRepository.findDescendants(location);
              locations.push(...children);
            }),
          );
        }),
      );

      return { locations, lang, status };
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointInventoriesService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
