import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { InventoryItemOutput } from 'src/domain/dto/flows';
import { Inventory, Investigation } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { Location } from 'src/domain/entities/warehouses';
import {
  InventoryRepository,
  InvestigationRepository,
} from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { LocationRepository } from 'src/repositories/warehouses';
import { InventoryUtilitiesService } from 'src/services/utilities';
import { GetInventoryByIdInput } from './dto';

@Injectable()
export class GetInventoryByIdService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Investigation)
    private readonly _investigationRepository: InvestigationRepository,
    private readonly _inventoryUtilitiesService: InventoryUtilitiesService,
  ) {}

  async getInventoryById(
    input: GetInventoryByIdInput,
    user: UserCon,
  ): Promise<InventoryItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetInventoryByIdInput,
    user: UserCon,
  ): Promise<InventoryItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const inventory = await this._inventoryRepository.findOne(
        input.inventoryId,
        {
          relations: [
            'location',
            'stockMovements',
            'inventoryStates',
            'investigations',
          ],
        },
      );
      if (!inventory) {
        throw new NotFoundException(`Inventory not found`);
      }

      await Promise.all(
        inventory.stockMovements.map(async (stockMovement) => {
          stockMovement.productItem = await this._productItemRepository.findOne(
            stockMovement.productItemId,
            { relations: ['location', 'supplier', 'productVariant'] },
          );

          stockMovement.sourceLocation = await this._locationRepository.findOne(
            stockMovement.sourceLocationId,
          );
          stockMovement.targetLocation = await this._locationRepository.findOne(
            stockMovement.targetLocationId,
          );

          return stockMovement;
        }),
      );

      const outputInvestigations: Investigation[] = [];

      if (inventory.investigations.length > 0) {
        await Promise.all(
          inventory.investigations.map(async (investigation) => {
            const outputInvestigation =
              await this._investigationRepository.findOne({
                where: { id: investigation.id },
                relations: ['productItem'],
              });

            outputInvestigations.push(outputInvestigation);
          }),
        );

        inventory.investigations = outputInvestigations;
      }

      const inventoryModel =
        await this._inventoryUtilitiesService.buildInventoryStatesOutput(
          inventory,
        );

      return new InventoryItemOutput(inventoryModel, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetInventoryByIdService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
