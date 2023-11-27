import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class DeleteAreaInput {
  @IsNotEmpty()
  @ApiProperty()
  areaId: string;
}
