import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
} from 'class-validator-multi-lang';


export class GetStoragePointsInput{
 
  pagination: PaginationDto;
  options?: any;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}