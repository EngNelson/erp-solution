import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue, ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';
import { AttributeOptionInput } from 'src/domain/dto/items/eav';
import { AttributeOptionType } from 'src/domain/types/catalog/eav';

export class EditAttributeSetInput {
  @IsNotEmpty()
  @ApiProperty()
  attributeSetId: string;

  @IsOptional()
  @ApiPropertyOptional()
  title: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    isArray: true,
    type: AttributeOptionInput,
  })
  attributeOptions: AttributeOptionType[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
