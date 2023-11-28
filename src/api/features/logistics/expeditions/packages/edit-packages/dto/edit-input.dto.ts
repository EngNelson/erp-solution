import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
// import { Reception } from 'src/domain/entities/flows';
// import { ProductItem } from 'src/domain/entities/items';
// import { Expedition } from 'src/domain/entities/logistics';
// import { StoragePoint } from 'src/domain/entities/warehouses';
import { PackageStatus } from 'src/domain/enums/logistics';



export class EditPackagesInput{

  @IsOptional()
  packageId?: string;
  
  @IsOptional()
  name?: string;

  @IsOptional()
  description?: string;

   
  @IsEnum({
    type: 'enum'
  })
  @IsOptional()
  status?: PackageStatus;
  

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}

