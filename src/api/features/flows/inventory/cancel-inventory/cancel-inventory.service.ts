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
import { Inventory } from 'src/domain/entities/flows';
import { OperationStatus } from 'src/domain/enums/flows';
import { InventoryRepository } from 'src/repositories/flows';
import { InventoryUtilitiesService } from 'src/services/utilities';
import { CancelInventoryInput } from './dto';

type ValidationResult = {
  inventory: Inventory;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelInventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    private readonly _inventoryUtilitiesService: InventoryUtilitiesService,
  ) {}

  async cancelInventory(
    input: CancelInventoryInput,
    user: UserCon,
  ): Promise<InventoryItemOutput> {
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
  ): Promise<InventoryItemOutput> {
    try {
      const { inventory, lang, user } = result;

      inventory.status = OperationStatus.CANCELED;
      inventory.canceledBy = user;
      inventory.canceledAt = new Date();

      await this._inventoryRepository.save(inventory);

      const inventoryModel =
        await this._inventoryUtilitiesService.buildInventoryStatesOutput(
          inventory,
        );

      return new InventoryItemOutput(inventoryModel, lang);
    } catch (error) {
      throw new BadRequestException(
        `${CancelInventoryService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: CancelInventoryInput,
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

      /**
       * Cannot cancel VALIDATED inventory
       */
      if (inventory.status === OperationStatus.VALIDATED) {
        throw new BadRequestException(
          `You cannot cancel a ${OperationStatus.VALIDATED} inventory`,
        );
      }

      return { inventory, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${CancelInventoryService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
