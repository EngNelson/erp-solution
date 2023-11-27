import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsOptional, Max, Min } from 'class-validator-multi-lang';

export class ArticlesOrderedInput {
  @IsNotEmpty()
  @ApiProperty()
  articleRef: string;

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
