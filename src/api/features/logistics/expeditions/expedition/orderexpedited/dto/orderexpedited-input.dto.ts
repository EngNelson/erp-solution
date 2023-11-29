import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';

export class OrderExpeditedInput{
 
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsEnum({
    type: 'enum'
  })
  @IsNotEmpty()
  @IsOptional()
  status: OrderStatus;
  
  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
  
}

