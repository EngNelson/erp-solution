import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class DeleteAttributeInput {
  @IsNotEmpty()
  @ApiProperty()
  attributeId: string;
}
