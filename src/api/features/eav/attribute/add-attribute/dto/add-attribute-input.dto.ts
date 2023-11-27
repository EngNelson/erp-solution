import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import {
  ArrayContainsUniqueValue,
  AttributeType,
  ISOLang,
  TString,
} from '@glosuite/shared';
import {
  ArrayContainDefinedAttributeValues,
  IsISOLang,
  IsTStringInput,
} from 'src/api/decorators';
import { AttributeValueInput } from 'src/domain/dto/items/eav';
import { ValueType } from 'src/domain/enums/items';
import { AttributeValueType } from 'src/domain/types/catalog/eav';

export class AddAttributeInput {
  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  name: TString;

  @IsNotEmpty()
  @IsEnum(AttributeType)
  @ApiProperty({
    enum: AttributeType,
  })
  type: AttributeType;

  @IsNotEmpty()
  @IsEnum(ValueType)
  @ApiProperty({
    enum: ValueType,
  })
  valueType: ValueType;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  hasUnit: boolean;

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
  @ApiProperty({
    type: [AttributeValueInput],
  })
  definedAttributeValues?: AttributeValueType[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
