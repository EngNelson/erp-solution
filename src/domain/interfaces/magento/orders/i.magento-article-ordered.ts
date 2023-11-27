export interface MagentoArticleOrdered {
  product_id: string;
  sku: string;
  product_type: string;
  base_cost: number;
  price: number;
  qty_ordered: number;
  row_total: number;
  created_at: Date;
  updated_at: Date;
}
