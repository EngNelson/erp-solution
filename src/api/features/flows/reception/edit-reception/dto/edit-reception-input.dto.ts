import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class EditReceptionInput {
  @IsNotEmpty()
  @ApiProperty()
  reference: string;

  @IsNotEmpty()
  @ApiProperty()
  comment: string;
}
