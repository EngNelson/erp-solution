import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class GetLocationsByStoragePointInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;
}
