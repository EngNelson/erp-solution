import { ApiProperty } from '@nestjs/swagger';

export class IdsDto {
  @ApiProperty({ type: [String] })
  ids: string[];
}
