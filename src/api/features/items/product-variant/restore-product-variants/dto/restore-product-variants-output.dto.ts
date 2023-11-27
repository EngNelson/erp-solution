import { ProductVariant } from 'src/domain/entities/items';

export class RestoreProductVariantsOutput {
  items: RestoreProductVariantOutputItem[];
  totalItemsRestored: number;

  constructor(
    items: RestoreProductVariantOutputItem[],
    totalItemsRestored: number,
  ) {
    this.items = items;
    this.totalItemsRestored = totalItemsRestored;
  }
}

export class RestoreProductVariantOutputItem {
  constructor(variant: ProductVariant) {
    this.id = variant.id;
    this.reference = variant.reference;
    this.sku = variant.sku;
  }

  id: string;
  reference: string;
  sku: string;
}
