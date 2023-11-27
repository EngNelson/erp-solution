import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang, TString } from '@glosuite/shared';
import {
  ArrayContainDefinedAttributeValues,
  IsISOLang,
  IsTStringInput,
} from 'src/api/decorators';
import { AttributeValueToEditInput } from 'src/domain/dto/items/eav';
import { AttributeValueType } from 'src/domain/types/catalog/eav';

export class EditAttributeInput {
  @IsNotEmpty()
  @ApiProperty()
  attributeId: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({
    type: JSON,
  })
  name?: TString;

  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  unitIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainDefinedAttributeValues()
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: [AttributeValueToEditInput],
  })
  newDefinedAttributeValues?: AttributeValueType[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
