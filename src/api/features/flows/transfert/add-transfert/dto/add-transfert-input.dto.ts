import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, TString } from '@glosuite/shared';
import { IsTStringInput } from 'src/api/decorators';
import { VariantsToTransfertInput } from 'src/domain/dto/flows';
import { VariantsToTransfertType } from 'src/domain/types/flows';

export class AddTransfertInput {
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
  })
  isRequest: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  orderReference?: string;

  @IsNotEmpty()
  @ApiProperty()
  sourceId: string;

  @IsNotEmpty()
  @ApiProperty()
  targetId: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

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
    type: [VariantsToTransfertInput],
  })
  variantsToTransfert: VariantsToTransfertType[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;
}
