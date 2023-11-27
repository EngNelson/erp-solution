import { ArticleOrdered } from 'src/domain/entities/orders';
import { LocationModel } from 'src/domain/interfaces/warehouses';
import { ProductVariantItemDetails } from '../catalog/items';

export type ArticlesOrderedModel = {
  articleOrdered: ArticleOrdered;
  variantDetails: Partial<ProductVariantItemDetails>;
  locations: LocationModel[];
};
