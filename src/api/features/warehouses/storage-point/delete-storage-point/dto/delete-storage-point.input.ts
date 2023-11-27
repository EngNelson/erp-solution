import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class DeleteStoragePointInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;
}
