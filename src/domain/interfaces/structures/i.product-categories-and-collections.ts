import { Category, Collection } from 'src/domain/entities/structures';

export interface ProductCategoriesAndCollections {
  productCategories: Category[];
  productCollections: Collection[];
}
