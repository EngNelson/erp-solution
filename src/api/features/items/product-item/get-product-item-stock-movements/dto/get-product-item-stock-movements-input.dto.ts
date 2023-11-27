import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { PaginationDto } from '@glosuite/shared';
import { GetStockMovementsOptionsDto } from 'src/domain/dto/items';

export class GetProductItemStockMovementsInput {
  @IsNotEmpty()
  @ApiProperty()
  productItemId: string;

  pagination: PaginationDto;

  oprions?: GetStockMovementsOptionsDto;
}
