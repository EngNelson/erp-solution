import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class GetVoucherByCodeInput {
  @IsNotEmpty()
  @ApiProperty()
  code: string;
}
