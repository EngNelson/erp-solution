import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class InstalmentModelInput {
  @IsNotEmpty()
  @ApiProperty()
  value: number;

  @IsNotEmpty()
  @ApiProperty()
  deadline: Date;
}
