import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InvestigationStatus } from 'src/domain/enums/flows';

export class GetInvestigationsOptionsDto {
  @IsOptional()
  @IsEnum(InvestigationStatus)
  @ApiPropertyOptional({ enum: InvestigationStatus })
  status?: InvestigationStatus;
}
