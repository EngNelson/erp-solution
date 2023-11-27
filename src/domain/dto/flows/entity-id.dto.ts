import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class EntityIdDto {
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  id?: string;
}
