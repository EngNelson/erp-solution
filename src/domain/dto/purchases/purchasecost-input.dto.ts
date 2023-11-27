import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class PurchaseCostInput {
  @IsNotEmpty()
  @ApiProperty()
  variantId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @IsPositive()
  @ApiProperty({
    type: Number,
  })
  purchaseCost: number;
}
