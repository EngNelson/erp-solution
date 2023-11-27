import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator-multi-lang';
import { SpecialPaymentType } from 'src/domain/enums/orders';

export class SpecialPaymentInput {
  @IsNotEmpty()
  @IsEnum(SpecialPaymentType)
  @ApiProperty({
    type: 'enum',
    enum: SpecialPaymentType,
  })
  type: SpecialPaymentType;

  @IsNotEmpty()
  @ApiProperty()
  amount: number;
}
