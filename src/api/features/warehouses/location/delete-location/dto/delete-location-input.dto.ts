import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class DeleteLocationInput {
  @IsNotEmpty()
  @ApiProperty()
  locationId: string;
}
