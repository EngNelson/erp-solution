import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class VariantsToTransfertInput {
  @IsNotEmpty()
  @ApiProperty()
  variantId: string;

  @IsNotEmpty()
  @IsPositive()
  @IsNumber()
  @ApiProperty()
  quantity: number;
}
