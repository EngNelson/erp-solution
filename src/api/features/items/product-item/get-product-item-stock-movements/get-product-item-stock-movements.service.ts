import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { StockMovementItemOutput } from 'src/domain/dto/flows';
import {
  Inventory,
  Reception,
  StockMovement,
  Transfert,
} from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { Location } from 'src/domain/entities/warehouses';
import { MovementType, TriggeredBy, TriggerType } from 'src/domain/enums/flows';
import {
  InventoryRepository,
  ReceptionRepository,
  StockMovementRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { LocationRepository } from 'src/repositories/warehouses';
import {
  GetProductItemStockMovementsInput,
  GetProductItemStockMovementsOutput,
} from './dto';

type ValidationResult = {
  productItem: ProductItem;
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  movementType?: MovementType;
  triggerType?: TriggerType;
  triggeredBy?: TriggeredBy;
};

type WhereClause = {
  productItemId: string;
  movementType?: MovementType;
  triggerType?: TriggerType;
  triggeredBy?: TriggeredBy;
};

@Injectable()
export class GetProductItemStockMovementsService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
  ) {}

  async getProductItemStockMovements(
    input: GetProductItemStockMovementsInput,
    user: UserCon,
  ): Promise<GetProductItemStockMovementsOutput> {
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
  ): Promise<GetProductItemStockMovementsOutput> {
    try {
      const {
        productItem,
        pageIndex,
        pageSize,
        lang,
        movementType,
        triggerType,
        triggeredBy,
      } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = { productItemId: productItem.id };
      if (movementType) whereClause.movementType = movementType;
      if (triggerType) whereClause.triggerType = triggerType;
      if (triggeredBy) whereClause.triggeredBy = triggeredBy;

      const stockMovements = await this._stockMovementRepository.find({
        where: whereClause,
        relations: [
          'productItem',
          'sourceLocation',
          'targetLocation',
          'reception',
          'supplierReturn',
          'inventory',
          'transfert',
          'order',
        ],
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      const [allStockMovements, count] =
        await this._stockMovementRepository.findAndCount({
          where: whereClause,
        });

      /**
       * Build the output
       */
      stockMovements.map((stockMovement) => {
        stockMovement.productItem = productItem;
        return stockMovement;
      });

      await Promise.all(
        stockMovements.map(async (stockMovement) => {
          if (stockMovement.sourceLocation) {
            stockMovement.sourceLocation =
              await this._locationRepository.findOne(
                stockMovement.sourceLocationId,
              );
          }

          if (stockMovement.targetLocation) {
            stockMovement.targetLocation =
              await this._locationRepository.findOne(
                stockMovement.targetLocationId,
              );
          }

          if (stockMovement.reception) {
            stockMovement.reception = await this._receptionRepository.findOne(
              stockMovement.receptionId,
              { relations: ['storagePoint', 'child'] },
            );

            if (stockMovement.reception.child) {
              stockMovement.reception.child =
                await this._receptionRepository.findOne(
                  stockMovement.reception.child.id,
                  { relations: ['storagePoint'] },
                );
            }
          }

          if (stockMovement.inventory) {
            stockMovement.inventory = await this._inventoryRepository.findOne(
              stockMovement.inventoryId,
              { relations: ['location'] },
            );
          }

          if (stockMovement.transfert) {
            stockMovement.transfert = await this._transfertRepository.findOne(
              stockMovement.transfertId,
              { relations: ['source', 'target', 'child'] },
            );
          }

          return stockMovement;
        }),
      );

      return new GetProductItemStockMovementsOutput(
        stockMovements.map(
          (stockMovement) => new StockMovementItemOutput(stockMovement, lang),
        ),
        count,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetProductItemStockMovementsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetProductItemStockMovementsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { productItemId, pagination, oprions } = input;

      const productItem = await this._productItemRepository.findOne(
        productItemId,
        { relations: ['productVariant', 'location', 'supplier'] },
      );

      if (!productItem) {
        throw new NotFoundException(`Product item not found`);
      }

      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : DEFAULT_PAGE_INDEX;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : DEFAULT_PAGE_SIZE;

      pagination.lang = pagination.lang
        ? pagination.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (Number.isNaN(pagination.pageIndex) || pagination.pageIndex <= 0) {
        throw new HttpException(
          `Invalid fields: pageIndex ${pagination.pageIndex}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (Number.isNaN(pagination.pageSize) || pagination?.pageSize < 0) {
        throw new HttpException(
          `Invalid fields: pageSize ${pagination.pageSize}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ISOLang[pagination.lang.toUpperCase()]) {
        throw new HttpException(
          `Invalid language input: ${pagination.lang} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return { productItem, ...pagination, ...oprions };
    } catch (error) {
      throw new BadRequestException(
        `${GetProductItemStockMovementsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
