import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OperationStatus } from 'src/domain/enums/flows';

export class GetInventoriesOptionsDto {
  @IsOptional()
  @IsEnum(OperationStatus)
  @ApiPropertyOptional({ enum: OperationStatus })
  status?: OperationStatus;
}
