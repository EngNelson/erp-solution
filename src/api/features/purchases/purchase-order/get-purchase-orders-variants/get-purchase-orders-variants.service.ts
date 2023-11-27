import { isNullOrWhiteSpace, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VariantPurchasedOutput } from 'src/domain/dto/purchases';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { VariantPurchasedItemDetails } from 'src/domain/types/purchases';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { ReportsService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { Like } from 'typeorm';
import {
  GetPurchaseOrdersVariantsInput,
  GetPurchaseOrdersVariantsOutput,
} from './dto';

type WhereClause = {
  storagePointId?: string;
};

@Injectable()
export class GetPurchaseOrdersVariantsService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _sharedService: SharedService,
    private readonly _reportsService: ReportsService,
  ) {}

  async getPurchaseOrderVariants(
    input: GetPurchaseOrdersVariantsInput,
    user: UserCon,
  ): Promise<GetPurchaseOrdersVariantsOutput> {
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
    input: GetPurchaseOrdersVariantsInput,
    user: UserCon,
  ): Promise<GetPurchaseOrdersVariantsOutput> {
    try {
      const { specificDate, storagePointId, lang } = input;

      let storagePoint: StoragePoint;
      const whereClause: WhereClause = {};

      if (storagePointId && !isNullOrWhiteSpace(storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: storagePointId },
        });

        if (storagePoint) {
          whereClause.storagePointId = storagePoint.id;
        }
      }

      const variantPurchasedItems: VariantPurchasedItemDetails[] = [];

      const purchaseOrders = await this._purchaseOrderRepository.find({
        where: { createdAt: Like(`${specificDate}%`), ...whereClause },
        relations: ['variantPurchaseds'],
      });

      if (purchaseOrders.length > 0) {
        for (const purchaseOrder of purchaseOrders) {
          if (purchaseOrder.variantPurchaseds.length > 0) {
            for (const variantPurchased of purchaseOrder.variantPurchaseds) {
              const variant = await this._productVariantRepository.findOne({
                where: { id: variantPurchased.variantId },
                relations: ['product', 'attributeValues'],
              });

              const product = await this._productRepository.findOne({
                where: { id: variant.productId },
                relations: ['categories'],
              });

              // Get categories
              const categories = await this._reportsService.getParentCategories(
                product.categories,
              );

              const variantItem =
                await this._sharedService.buildVariantDetailsOutput(
                  variant,
                  categories,
                );

              variantPurchasedItems.push({
                variantPurchased,
                variantItem,
              });
            }
          }
        }
      }

      const output = new GetPurchaseOrdersVariantsOutput(
        variantPurchasedItems.map(
          (variantPurchasedItem) =>
            new VariantPurchasedOutput(variantPurchasedItem, lang),
        ),
        variantPurchasedItems.length,
      );

      return output;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetPurchaseOrdersVariantsService.name} - ${this._tryExecution.name}: `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
