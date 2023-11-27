import { IsOptional, IsEnum } from 'class-validator-multi-lang';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerReturnState,
  CustomerReturnStatus,
} from 'src/domain/enums/flows';

export class GetCustomerReturnsOptionsDto {
  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  @IsOptional()
  @IsEnum(CustomerReturnStatus)
  @ApiPropertyOptional({ type: 'enum', enum: CustomerReturnStatus })
  status?: CustomerReturnStatus;

  @IsOptional()
  @IsEnum(CustomerReturnState)
  @ApiPropertyOptional({ type: 'enum', enum: CustomerReturnState })
  state?: CustomerReturnState;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  orderId?: string;
}
