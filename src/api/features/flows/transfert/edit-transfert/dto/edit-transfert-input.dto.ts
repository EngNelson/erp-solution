import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class EditTransfertInput {
  @IsNotEmpty()
  @ApiProperty()
  reference: string;

  @IsNotEmpty()
  @ApiProperty()
  comment: string;
}
