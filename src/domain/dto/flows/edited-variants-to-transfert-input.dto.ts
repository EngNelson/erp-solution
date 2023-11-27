import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { OperationLineState } from 'src/domain/enums/flows';

export class EditedVariantsToTransfertInput {
  @IsNotEmpty()
  @ApiProperty()
  variantTransfertId: string;

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
