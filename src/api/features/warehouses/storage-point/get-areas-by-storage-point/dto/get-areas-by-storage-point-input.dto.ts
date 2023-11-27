import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';
import { PaginationDto } from '@glosuite/shared';
import { GetAreasByStoragePointOptionsDto } from 'src/domain/dto/warehouses';

export class GetAreasByStoragePointInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;

  pagination: PaginationDto;

  options?: GetAreasByStoragePointOptionsDto;
}
