import { ISOLang } from '@glosuite/shared';
import { StatusLine } from 'src/domain/enums/flows';
import { ArticlesOrderedModel } from 'src/domain/types/orders';
import {
  GetOrderByIdMiniProductVariantOutput,
  MiniProductVariantOutput,
} from '../items';
import { PickPackLocationOutput } from '../warehouses';
import { ArticleOrderedItemDetails } from 'src/domain/interfaces/orders';

export class ArticlesOrderedOutput {
  constructor(articleOrderedModel: ArticlesOrderedModel, lang: ISOLang) {
    this.id = articleOrderedModel.articleOrdered.id;
    this.quantity = articleOrderedModel.articleOrdered.quantity;
    this.pickedQuantity = articleOrderedModel.articleOrdered.pickedQuantity;
    this.status = articleOrderedModel.articleOrdered.status;
    this.position = articleOrderedModel.articleOrdered.position;
    this.price = articleOrderedModel.articleOrdered.price;
    this.totalPrice = articleOrderedModel.articleOrdered.totalPrice;
    this.variant = new GetOrderByIdMiniProductVariantOutput(
      articleOrderedModel.variantDetails,
      lang,
    );
    this.locations = articleOrderedModel.locations.map(
      (locationModel) => new PickPackLocationOutput(locationModel, lang),
    );
    this.createdAt = articleOrderedModel.articleOrdered.createdAt;
  }

  id: string;
  quantity: number;
  pickedQuantity: number;
  status: StatusLine;
  position: number;
  price: number;
  totalPrice: number;
  variant: GetOrderByIdMiniProductVariantOutput;
  locations: PickPackLocationOutput[];
  createdAt: Date;
}

export class ArticlesOrderedForReportOutput {
  constructor(articleOrderedModel: ArticleOrderedItemDetails, lang: ISOLang) {
    this.id = articleOrderedModel.articleOrdered.id;
    this.quantity = articleOrderedModel.articleOrdered.quantity;
    this.pickedQuantity = articleOrderedModel.articleOrdered.pickedQuantity;
    this.status = articleOrderedModel.articleOrdered.status;
    this.position = articleOrderedModel.articleOrdered.position;
    this.price = articleOrderedModel.articleOrdered.price;
    this.totalPrice = articleOrderedModel.articleOrdered.totalPrice;
    this.variant = new MiniProductVariantOutput(
      articleOrderedModel.articleItem,
      lang,
    );
    this.createdAt = articleOrderedModel.articleOrdered.createdAt;
  }

  id: string;
  quantity: number;
  pickedQuantity: number;
  status: StatusLine;
  position: number;
  price: number;
  totalPrice: number;
  variant: MiniProductVariantOutput;
  createdAt: Date;
}
