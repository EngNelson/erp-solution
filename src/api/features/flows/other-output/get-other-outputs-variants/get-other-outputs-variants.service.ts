import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OtherOutput } from 'src/domain/entities/flows';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OtherOutputRepository } from 'src/repositories/flows';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { ReportsService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import {
  GetOtherOutputsVariantsInput,
  GetOtherOutputsVariantsOutput,
} from './dto';
import { UserCon, isNullOrWhiteSpace } from '@glosuite/shared';
import { VariantToOutputItemDetails } from 'src/domain/interfaces/flows';
import { Like } from 'typeorm';
import { VariantOutputOutput } from 'src/domain/dto/flows';

type WhereClause = {
  storagePointId?: string;
};

@Injectable()
export class GetOtherOutputsVariantsService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _sharedService: SharedService,
    private readonly _reportsService: ReportsService,
  ) {}

  async getOtherOutputsVariants(
    input: GetOtherOutputsVariantsInput,
    user: UserCon,
  ): Promise<GetOtherOutputsVariantsOutput> {
    const result = await this._tryExecution(input);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetOtherOutputsVariantsInput,
  ): Promise<GetOtherOutputsVariantsOutput> {
    try {
      const { specificDate, storagePointId, lang } = input;

      let storagePoint: StoragePoint;
      const whereClause: WhereClause = {};

      if (storagePointId && !isNullOrWhiteSpace(storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: storagePointId },
        });

        if (!storagePoint) {
          throw new NotFoundException(
            `Sorry the storage point ${storagePointId} does not exist`,
          );
        }

        whereClause.storagePointId = storagePoint.id;
      }

      const variantToOutputItems: VariantToOutputItemDetails[] = [];

      const otherOutputs = await this._otherOutputRepository.find({
        where: { createdAt: Like(`${specificDate}%`), ...whereClause },
        relations: ['variantsToOutput'],
      });

      if (otherOutputs && otherOutputs.length > 0) {
        await Promise.all(
          otherOutputs.map(async (otherOutput) => {
            if (otherOutput.variantsToOutput.length > 0) {
              await Promise.all(
                otherOutput.variantsToOutput.map(async (variantToOutput) => {
                  const variant = await this._productVariantRepository.findOne({
                    where: { id: variantToOutput.productVariantId },
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

                  variantToOutputItems.push({
                    variantToOutput,
                    variantItem,
                  });
                }),
              );
            }
          }),
        );
      }

      const output = new GetOtherOutputsVariantsOutput(
        variantToOutputItems.map(
          (variantOutputItem) =>
            new VariantOutputOutput(variantOutputItem, lang),
        ),
        variantToOutputItems.length,
      );

      return output;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOtherOutputsVariantsService.name} - ${this._tryExecution.name}: `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
