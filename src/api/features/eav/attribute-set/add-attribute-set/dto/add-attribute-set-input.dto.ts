import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { TString } from '@glosuite/shared';
import { IsTStringInput } from 'src/api/decorators';
import { AttributeOptionInput } from 'src/domain/dto/items/eav';
import { AttributeOptionType } from 'src/domain/types/catalog/eav';

export class AddAttributeSetInput {
  @IsNotEmpty()
  @ApiProperty()
  title: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsOptional()
  @ApiPropertyOptional({
    type: [AttributeOptionInput],
  })
  attributeOptions?: AttributeOptionType[];
}
