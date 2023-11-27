import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class DeleteMobileUnitInput {
  @IsNotEmpty()
  @ApiProperty()
  mobileUnitId: string;
}
