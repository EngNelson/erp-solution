import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';

export class GetReceptionsOptionsDto {
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  storagePointName?: string;

  @IsOptional()
  @IsEnum(ReceptionType)
  @ApiPropertyOptional({ enum: ReceptionType })
  type?: ReceptionType;

  @IsOptional()
  @IsEnum(OperationStatus)
  @ApiPropertyOptional({ enum: OperationStatus })
  status?: OperationStatus;

  @IsOptional()
  @ApiPropertyOptional()
  startDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  endDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  specificDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  @IsOptional()
  @ApiPropertyOptional()
  orderRef?: string;
}
