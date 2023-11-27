import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';
import { SharedService } from '../utilities';

@Injectable()
export class ProductItemBarcodeService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    const items = await this._productItemRepository.find();
    let code = '';
    let isCodeExist = true;

    do {
      code = (await this._sharedService.randomNumber(13)).toString();
      isCodeExist = items.some((item) => item.barcode === code);
    } while (isCodeExist);

    return code;
  }
}
