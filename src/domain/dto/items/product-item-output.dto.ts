import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Product } from 'src/domain/entities/items';
import { ProductType } from 'src/domain/enums/items';
import { ProductQuantity } from 'src/domain/interfaces';
import { ProductCompositionItemOutput } from '.';
import { MiniUserOutput } from '../auth';
import { MiniCategoryOutput } from '../structures';
import { MiniAttributeSetOutput } from './eav';

export class ProductItemOutput {
  constructor(product: Product, lang: ISOLang) {
    this.id = product.id;
    this.reference = product.reference;
    this.title = getLangOrFirstAvailableValue(product.title, lang);
    this.sku = product.sku;
    this.productType = product.productType;
    this.categories = product.categories.map(
      (category) => new MiniCategoryOutput(category, lang),
    );
    this.attributeSet = product.attributeSet
      ? new MiniAttributeSetOutput(product.attributeSet)
      : null;
    this.countVariants = product.productVariants
      ? product.productVariants.length
      : 0;
    this.canBeSold = product.canBeSold;
    this.canBeRented = product.canBeRented;
    this.canBePackaged = product.canBePackaged;
    this.mustBePackaged = product.mustBePackaged;
    this.quantity = product.quantity;
    this.children = product.children
      ? product.children.map(
          (child) => new ProductCompositionItemOutput(child, lang),
        )
      : [];
    this.createdBy = product.createdBy
      ? new MiniUserOutput(product.createdBy)
      : null;
    this.createdAt = product.createdAt;
    this.lastUpdate = product.lastUpdate;
  }

  id: string;
  reference: string;
  title: string;
  sku: string;
  productType: ProductType;
  categories: MiniCategoryOutput[];
  attributeSet: MiniAttributeSetOutput;
  countVariants: number;
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
