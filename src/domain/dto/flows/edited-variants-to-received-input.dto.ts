import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator-multi-lang';
import { OperationLineState } from 'src/domain/enums/flows';

export class EditedVariantsToReceivedInput {
  @IsNotEmpty()
  @ApiProperty()
  variantReceptionId: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  newQuantity: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiPropertyOptional()
  purchaseCost?: number;

  @IsNotEmpty()
  @IsEnum(OperationLineState)
  @ApiProperty({
    enum: OperationLineState,
  })
  newState: OperationLineState;
}
