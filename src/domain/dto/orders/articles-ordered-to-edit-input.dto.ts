import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, Max, Min } from 'class-validator-multi-lang';

export class ArticlesOrderedToEditInput {
  @IsNotEmpty()
  @ApiProperty()
  articleId: string;

  @IsNotEmpty()
  @ApiProperty({
    type: Number,
  })
  quantity: number;

  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
  })
  customPrice?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  @ApiPropertyOptional({
    type: Number,
  })
  discount?: number;
}
