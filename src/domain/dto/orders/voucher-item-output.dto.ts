import { DiscountType } from '@glosuite/shared';
import { Voucher } from 'src/domain/entities/orders';

export class VoucherItemOutput {
  constructor(voucher: Voucher) {
    this.id = voucher.id;
    this.code = voucher.code ? voucher.code : null;
    this.type = voucher.type;
    this.value = voucher.value;
    this.startDate = voucher.startDate ? voucher.startDate : null;
    this.endDate = voucher.endDate ? voucher.endDate : null;
  }

  id: string;
  code?: string;
  type: DiscountType;
  value: number;
  startDate?: Date;
  endDate?: Date;
}
