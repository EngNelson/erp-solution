import { MagentoOrderStatus } from 'src/domain/enums/magento';

export interface UpdateOrderStatusBody {
  gt_user: string;
  new_status: MagentoOrderStatus;
}
