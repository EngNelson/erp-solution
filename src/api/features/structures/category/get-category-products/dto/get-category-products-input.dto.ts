import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';
import { PaginationInput } from '@glosuite/shared';
import { GetProductsOptionsInput } from 'src/domain/dto/items';

export class GetCategoryProductsInput {
  @IsNotEmpty()
  @ApiProperty()
  categoryId: string;

  // @ApiProperty()
  // pagination: PaginationInput;

  options?: GetProductsOptionsInput;
}
