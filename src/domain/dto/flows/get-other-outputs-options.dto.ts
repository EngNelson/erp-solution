import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { OutputStatus, OutputType } from 'src/domain/enums/flows';

export class GetOtherOutputsOptionsDto {
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  storagePointName?: string;

  @IsOptional()
  @IsEnum(OutputStatus)
  @ApiPropertyOptional({ enum: OutputStatus })
  status?: OutputStatus;

  @IsOptional()
  @IsEnum(OutputType)
  @ApiPropertyOptional({ enum: OutputType })
  outputType?: OutputType;

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
