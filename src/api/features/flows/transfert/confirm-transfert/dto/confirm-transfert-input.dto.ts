import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { EditedVariantsToTransfertInput } from 'src/domain/dto/flows';
import { EditedVariantsToTransfertType } from 'src/domain/types/flows';

export class ConfirmTransfertInput {
  @IsNotEmpty()
  @ApiProperty()
  transfertId: string;

  /**
   * Edit variants
   * quantity
   * state
   */
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    type: [EditedVariantsToTransfertInput],
  })
  editedVariantsToTransfert: EditedVariantsToTransfertType[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
