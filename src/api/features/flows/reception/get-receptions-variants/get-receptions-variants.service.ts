import { isNullOrWhiteSpace, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VariantReceptionOutput } from 'src/domain/dto/flows';
import { Reception } from 'src/domain/entities/flows';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { VariantReceptionItemDetails } from 'src/domain/types/flows';
import { ReceptionRepository } from 'src/repositories/flows';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { ReportsService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { Like } from 'typeorm';
import { GetReceptionsVariantsInput, GetReceptionsVariantsOutput } from './dto';

type WhereClause = {
  storagePointId?: string;
};

@Injectable()
export class GetReceptionsVariantsService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _sharedService: SharedService,
    private readonly _reportsService: ReportsService,
  ) {}

  async getReceptionsVariants(
    input: GetReceptionsVariantsInput,
    user: UserCon,
  ): Promise<GetReceptionsVariantsOutput> {
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
    input: GetReceptionsVariantsInput,
    user: UserCon,
  ): Promise<GetReceptionsVariantsOutput> {
    try {
      const { specificDate, storagePointId, lang } = input;

      let storagePoint: StoragePoint;
      let whereClause: WhereClause;

      if (storagePointId && !isNullOrWhiteSpace(storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: storagePointId },
        });

        if (!storagePoint) {
          throw new NotFoundException(
            `Sorry the storage point you precised was not found`,
          );
        }

        whereClause.storagePointId = storagePoint.id;
      }

      const variantReceptionItems: VariantReceptionItemDetails[] = [];

      const receptions = await this._receptionRepository.find({
        where: { createdAt: Like(`${specificDate}%`), ...whereClause },
        relations: ['variantReceptions'],
      });

      if (receptions.length > 0) {
        await Promise.all(
          receptions.map(async (reception) => {
            if (reception.variantReceptions.length > 0) {
              await Promise.all(
                reception.variantReceptions.map(async (variantReception) => {
                  const variant = await this._productVariantRepository.findOne({
                    where: { id: variantReception.variantId },
                    relations: ['product', 'attributeValues'],
                  });

                  const product = await this._productRepository.findOne({
                    where: { id: variant.productId },
                    relations: ['categories'],
                  });

                  // Get categories
                  const categories =
                    await this._reportsService.getParentCategories(
                      product.categories,
                    );

                  const variantItem =
                    await this._sharedService.buildVariantDetailsOutput(
                      variant,
                      categories,
                    );

                  variantReceptionItems.push({
                    variantReception,
                    variantItem,
                  });
                }),
              );
            }
          }),
        );
      }

      const output = new GetReceptionsVariantsOutput(
        variantReceptionItems.map(
          (variantReceptionItem) =>
            new VariantReceptionOutput(variantReceptionItem, lang),
        ),
        variantReceptionItems.length,
      );

      return output;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetReceptionsVariantsService.name} - ${this._tryExecution.name}: `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
