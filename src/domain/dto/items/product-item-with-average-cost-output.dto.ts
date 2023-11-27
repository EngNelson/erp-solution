import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { ProductType } from 'src/domain/enums/items';
import { ProductQuantity } from 'src/domain/interfaces';
import { GetProductsItemOutputModel } from 'src/domain/interfaces/items';
import { ProductCompositionItemOutput } from '.';
import { MiniUserOutput } from '../auth';
import { MiniCategoryOutput } from '../structures';
import { MiniAttributeSetOutput } from './eav';

export class ProductItemWithAverageCostOutput {
  constructor(productModel: GetProductsItemOutputModel, lang: ISOLang) {
    this.id = productModel.product.id;
    this.reference = productModel.product.reference;
    this.title = getLangOrFirstAvailableValue(productModel.product.title, lang);
    this.sku = productModel.product.sku;
    this.productType = productModel.product.productType;
    this.categories = productModel.product.categories.map(
      (category) => new MiniCategoryOutput(category, lang),
    );
    this.attributeSet = productModel.product.attributeSet
      ? new MiniAttributeSetOutput(productModel.product.attributeSet)
      : null;
    this.countVariants = productModel.product.productVariants.length;
    this.averageCost = productModel.averageCost;
    this.canBeSold = productModel.product.canBeSold;
    this.canBeRented = productModel.product.canBeRented;
    this.canBePackaged = productModel.product.canBePackaged;
    this.mustBePackaged = productModel.product.mustBePackaged;
    this.quantity = productModel.product.quantity;
    this.children = productModel.product.children
      ? productModel.product.children.map(
          (child) => new ProductCompositionItemOutput(child, lang),
        )
      : [];
    this.createdBy = productModel.product.createdBy
      ? new MiniUserOutput(productModel.product.createdBy)
      : null;
    this.createdAt = productModel.product.createdAt;
    this.lastUpdate = productModel.product.lastUpdate;
  }

  id: string;
  reference: string;
  title: string;
  sku: string;
  productType: ProductType;
  categories: MiniCategoryOutput[];
  attributeSet: MiniAttributeSetOutput;
  countVariants: number;
  averageCost: number;
  canBeSold: boolean;
  canBeRented?: boolean;
  canBePackaged?: boolean;
  mustBePackaged?: boolean;
  quantity: ProductQuantity;
  children?: ProductCompositionItemOutput[];
  createdBy?: MiniUserOutput;
  createdAt: Date;
  lastUpdate: Date;
}
