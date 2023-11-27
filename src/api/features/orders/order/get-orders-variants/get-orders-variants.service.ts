import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StepStatus } from 'src/domain/enums/flows';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetOrdersVariantsInput, GetOrdersVariantsOutput } from './dto';
import { UserCon, isNullOrWhiteSpace } from '@glosuite/shared';
import { ArticleOrderedItemDetails } from 'src/domain/interfaces/orders';
import { Like } from 'typeorm';
import { SharedService } from 'src/services/utilities';
import { ReportsService } from 'src/services/generals';
import { ArticlesOrderedForReportOutput } from 'src/domain/dto/orders';

type WhereClause = {
  storagePointId?: string;
  orderStatus?: StepStatus;
};

@Injectable()
export class GetOrdersVariantsService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _sharedService: SharedService,
    private readonly _reportsService: ReportsService,
  ) {}

  async getOrdersVariants(
    input: GetOrdersVariantsInput,
    user: UserCon,
  ): Promise<GetOrdersVariantsOutput> {
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
    input: GetOrdersVariantsInput,
    user: UserCon,
  ): Promise<GetOrdersVariantsOutput> {
    try {
      const { specificDate, storagePointId, orderStatus, lang } = input;

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

      if (orderStatus) whereClause.orderStatus = orderStatus;

      const articlesOrderedItems: ArticleOrderedItemDetails[] = [];

      const orders = await this._orderRepository.find({
        where: {
          createdAt: Like(`${specificDate}%`),
          ...whereClause,
        },
        relations: ['articleOrdereds'],
      });

      if (orders.length > 0) {
        for (const order of orders) {
          if (order.articleOrdereds.length > 0) {
            for (const articleOrdered of order.articleOrdereds) {
              const variant = await this._productVariantRepository.findOne({
                where: { id: articleOrdered.productVariantId },
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

              const articleItem =
                await this._sharedService.buildVariantDetailsOutput(
                  variant,
                  categories,
                );

              articlesOrderedItems.push({
                articleOrdered,
                articleItem,
              });
            }
          }
        }
      }

      const output = new GetOrdersVariantsOutput(
        articlesOrderedItems.map(
          (articlesOrderedItem) =>
            new ArticlesOrderedForReportOutput(articlesOrderedItem, lang),
        ),
        articlesOrderedItems.length,
      );

      return output;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOrdersVariantsService.name} - ${this._tryExecution.name}: `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
