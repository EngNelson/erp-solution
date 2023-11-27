import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TransfertStatus, TransfertType } from 'src/domain/enums/flows';

export class GetTransfertsOptionsDto {
  @IsOptional()
  @IsEnum(TransfertStatus)
  @ApiPropertyOptional({
    enum: TransfertStatus,
  })
  status?: TransfertStatus;

  @IsOptional()
  @IsEnum(TransfertType)
  @ApiPropertyOptional({
    enum: TransfertType,
  })
  type?: TransfertType;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

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

  @IsOptional()
  @ApiPropertyOptional()
  targetId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  sourceId?: string;
}
