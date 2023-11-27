import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';
import { GetOrderByBarcodeOption } from './get-order-by-barcode-option.dto';

export class GetOrderByBarcodeInput {
  @IsNotEmpty()
  @ApiProperty()
  barcode: string;

  options: GetOrderByBarcodeOption;
}
