import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class MoveCategoryInput {
  @IsNotEmpty()
  @ApiProperty()
  categoryId: string;

  @IsNotEmpty()
  @ApiProperty()
  targetCategoryId: string;
}
