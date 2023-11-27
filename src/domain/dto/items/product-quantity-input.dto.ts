import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ProductQuantityInput {
  @IsNotEmpty()
  @ApiProperty({ type: Number })
  available: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  discovered: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  reservered: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  inTransit: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  deliveryProcessing: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  awaitingSAV: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  delivered: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  pendingInvestigation: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  lost: number;

  @IsNotEmpty()
  @ApiProperty({ type: Number })
  isDead: number;
}
