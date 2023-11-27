import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator-multi-lang';
import { CollectionType, Status } from '@glosuite/shared';

export class GetCollectionsOptionsDto {
  @IsOptional()
  @ApiPropertyOptional({ enum: Status, default: Status.ENABLED })
  status?: Status;

  @IsOptional()
  @ApiPropertyOptional({ enum: CollectionType })
  type?: CollectionType;
}
