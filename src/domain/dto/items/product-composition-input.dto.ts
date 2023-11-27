import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class ProductCompositionInput {
  @IsNotEmpty()
  @ApiProperty()
  childId: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  required: boolean;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @ApiProperty({ type: Number })
  defaultQuantity: number;
}
