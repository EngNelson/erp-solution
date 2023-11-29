import {
    IsEnum,
    IsOptional,
  } from 'class-validator-multi-lang';
  
  
  
  export class GetExpeditionInput{
    @IsOptional()
    packageId?: string;
    
    @IsOptional()
    @IsEnum(ISOLang)
    @IsISOLang()
    @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
    lang?: ISOLang;
  
  }
  
  