import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AddCommentInput {
  @IsNotEmpty()
  @ApiProperty()
  content: string;
}
