import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator-multi-lang';
import { OperationLineState } from 'src/domain/enums/flows';

export class EditedVariantsToPurchaseInput {
  @IsNotEmpty()
  @ApiProperty()
  variantPurchasedId: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  newQuantity: number;

  @IsNotEmpty()
  @IsEnum(OperationLineState)
  @ApiProperty({
    enum: OperationLineState,
  })
  newState: OperationLineState;
}
