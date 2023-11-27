import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { PaginationInput } from '@glosuite/shared';

export class GetItemsByProductVariantInput {
  @IsNotEmpty()
  @ApiProperty()
  variantId: string;

  @ApiProperty()
  pagination: PaginationInput;
}
