import { ApiPropertyOptional } from '@nestjs/swagger';

export class PasswordDto {
  @ApiPropertyOptional()
  password?: string;
}
