import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { PaginationDto } from '@glosuite/shared';
import { GetLocationsByAreaOptionsDto } from 'src/domain/dto/warehouses';

export class GetLocationsByAreaInput {
  @IsNotEmpty()
  @ApiProperty()
  areaId: string;

  pagination: PaginationDto;

  options?: GetLocationsByAreaOptionsDto;
}
