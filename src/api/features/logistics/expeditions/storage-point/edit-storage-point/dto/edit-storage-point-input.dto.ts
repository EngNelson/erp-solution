import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { Address } from 'src/domain/entities/shared';


export class EditStoragePointInput{

  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;
 
  @IsNotEmpty()
  @ApiProperty()
  storagePointAddress: Address;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}