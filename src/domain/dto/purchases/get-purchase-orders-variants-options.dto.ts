import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
} from 'class-validator-multi-lang';
import { OperationStatus } from 'src/domain/enums/flows';

export class GetPurchaseOrdersVariantsOptionsDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ApiPropertyOptional({
    isArray: true,
    type: OperationStatus,
  })
  status?: OperationStatus[];
}
