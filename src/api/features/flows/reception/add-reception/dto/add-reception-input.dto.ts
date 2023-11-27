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
import { VariantToReceivedInput } from 'src/domain/dto/flows';
import { VariantToReceivedType } from 'src/domain/types/flows';

export class AddReceptionInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;

  @IsOptional()
  @ApiPropertyOptional()
  orderRef?: string;

  /**
   * Variants added on
   * transfert
   */
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    type: [VariantToReceivedInput],
  })
  variantsToReceived: VariantToReceivedType[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
