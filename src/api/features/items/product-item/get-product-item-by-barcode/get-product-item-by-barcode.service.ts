import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ProductItemItemOutput } from 'src/domain/dto/items';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';
import { GetProductItemByBarcodeInput } from './dto';

@Injectable()
export class GetProductItemByBarcodeService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
  ) {}

  async getProductItemByBarcode(
    input: GetProductItemByBarcodeInput,
    user: UserCon,
  ): Promise<ProductItemItemOutput> {
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
    input: GetProductItemByBarcodeInput,
    user: UserCon,
  ): Promise<ProductItemItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const productItem = await this._productItemRepository.findOne(
        { barcode: input.barcode },
        { relations: ['productVariant', 'location', 'supplier'] },
      );

      if (!productItem) {
        throw new NotFoundException(
          `Product item with barcode ${input.barcode} not found`,
        );
      }

      return new ProductItemItemOutput(productItem, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetProductItemByBarcodeService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
