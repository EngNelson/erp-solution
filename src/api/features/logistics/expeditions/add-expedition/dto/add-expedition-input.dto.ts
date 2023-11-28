import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { PackageStatus } from 'src/domain/enums/logistics';

export class AddPackagesInput{
 
  @IsNotEmpty()
  @IsOptional()
  name: string;

  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsEnum({
    type: 'enum'
  })
  @IsNotEmpty()
  @IsOptional()
  status: PackageStatus;
  
  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
  
}

