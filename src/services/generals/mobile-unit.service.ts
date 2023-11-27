import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MobileUnit } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import { ProductItemRepository } from 'src/repositories/items';

@Injectable()
export class MobileUnitService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
  ) {}

  async buildMobileUnitModel(mobileUnit: MobileUnit): Promise<MobileUnitModel> {
    try {
      const itemsScanned: ProductItem[] = [];

      if (mobileUnit.barcodesScanned && mobileUnit.barcodesScanned.length > 0) {
        await Promise.all(
          mobileUnit.barcodesScanned.map(async (barcode) => {
            const item = await this._productItemRepository.findOne({
              where: { barcode },
              relations: ['productVariant'],
            });

            itemsScanned.push(item);
          }),
        );
      }

      return {
        mobileUnit,
        itemsScanned,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }
}
