import { PaginationDto } from '@glosuite/shared';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
export class GetPackagesInput {
  pagination: PaginationDto;
  options?: any;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}