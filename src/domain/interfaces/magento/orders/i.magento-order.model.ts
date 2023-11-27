import { MagentoAddressModel } from './i.magento-address.model';
import { MagentoArticleOrdered } from './i.magento-article-ordered';
import { MagentoOrderStatusHistory } from './i.magento-order-status-history';
import { MagentoPayementModel } from './i.magento-payment.model';

export interface MagentoOrderModel {
  entity_id: number;
  increment_id: string;
  order_currency_code: string;
  discount_amount: number;
  state: string;
  status: string;
  total_qty_ordered: number;
  subtotal: number;
  grand_total: number;
  created_at: Date;
  updated_at: Date;
  seller_info: string;
  shipping_description: string;
  billing_address: MagentoAddressModel;
  shipping_address: MagentoAddressModel;
  payment: MagentoPayementModel;
  status_histories: MagentoOrderStatusHistory[];
  items: MagentoArticleOrdered[];
}
