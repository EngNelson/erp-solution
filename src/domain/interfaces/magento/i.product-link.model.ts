export interface ProductLinkModel {
  id: number;
  sku: string;
  qty: number;
  is_default: boolean;
  price: number;
  can_change_quantity: boolean;
}
