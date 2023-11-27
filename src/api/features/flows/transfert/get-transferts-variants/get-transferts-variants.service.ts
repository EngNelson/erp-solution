import { isNullOrWhiteSpace, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VariantTransfertOutput } from 'src/domain/dto/flows/transfert';
import { Transfert } from 'src/domain/entities/flows';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { VariantTransfertItemDetails } from 'src/domain/interfaces/flows/transfert';
import { TransfertRepository } from 'src/repositories/flows';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { ReportsService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { Like } from 'typeorm';
import { GetTransfertsVariantsInput, GetTransfertsVariantsOutput } from './dto';

type WhereClause = {
  targetId?: string;
};

@Injectable()
export class GetTransfertsVariantsService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _sharedService: SharedService,
    private readonly _reportsService: ReportsService,
  ) {}

  async getTransfertsVariants(
    input: GetTransfertsVariantsInput,
    user: UserCon,
  ): Promise<GetTransfertsVariantsOutput> {
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
    input: GetTransfertsVariantsInput,
    user: UserCon,
  ): Promise<GetTransfertsVariantsOutput> {
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
            `Sorry, no storage point found for ${storagePointId}`,
          );
        }

        whereClause.targetId = storagePoint.id;
      }

      const variantTransfertItems: VariantTransfertItemDetails[] = [];

      const transferts = await this._transfertRepository.find({
        where: { createdAt: Like(`${specificDate}%`), ...whereClause },
        relations: ['variantTransferts'],
      });

      if (transferts.length > 0) {
        await Promise.all(
          transferts.map(async (transfert) => {
            if (transfert.variantTransferts.length > 0) {
              await Promise.all(
                transfert.variantTransferts.map(async (variantTransfert) => {
                  const variant = await this._productVariantRepository.findOne({
                    where: { id: variantTransfert.variantId },
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

                  variantTransfertItems.push({
                    variantTransfert,
                    variantItem,
                  });
                }),
              );
            }
          }),
        );
      }

      const output = new GetTransfertsVariantsOutput(
        variantTransfertItems.map(
          (variantTransfertItem) =>
            new VariantTransfertOutput(variantTransfertItem, lang),
        ),
        variantTransfertItems.length,
      );

      return output;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetTransfertsVariantsService.name} - ${this._tryExecution.name}: `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
