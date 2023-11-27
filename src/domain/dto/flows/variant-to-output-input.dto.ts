import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class VariantToOutputInput {
  @IsNotEmpty()
  @ApiProperty()
  productVariantId: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty({
    type: Number,
  })
  quantity: number;
}
