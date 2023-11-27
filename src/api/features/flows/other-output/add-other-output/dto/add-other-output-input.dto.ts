import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { VariantToOutputInput } from 'src/domain/dto/flows';
import { OutputType } from 'src/domain/enums/flows';
import { VariantToOutputType } from 'src/domain/types/flows';

export class AddOtherOutputInput {
  @IsNotEmpty()
  @IsEnum(OutputType)
  @ApiProperty({ enum: OutputType })
  outputType: OutputType;

  @IsOptional()
  @ApiPropertyOptional()
  magentoOrderID?: string;

  @IsNotEmpty()
  @ApiProperty()
  storagePointRef: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    isArray: true,
    type: VariantToOutputInput,
  })
  variantsToOutput: VariantToOutputType[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
