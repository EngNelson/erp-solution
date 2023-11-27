import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { Reception } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { Expedition } from 'src/domain/entities/logistics';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { PackageStatus } from 'src/domain/enums/logistics';



export class AddPackagesInput{
  @IsNotEmpty()
  @IsOptional()
  reference: string;
  
  @IsNotEmpty()
  @IsOptional()
  name: string;

  @IsNotEmpty()
  @IsOptional()
  description?: string;

   
 
  @IsNotEmpty()
  @IsOptional()
  status: PackageStatus;
  
  
  @IsNotEmpty()
  @IsOptional()
 storagePointId?: string;

 @IsNotEmpty()
 @IsOptional()
  storagePoint?: StoragePoint;

  @IsNotEmpty()
  @IsOptional()
  receptionId?: string;

  @IsNotEmpty()
  @IsOptional()
  reception: Reception;

  @IsNotEmpty()
  @IsOptional()
  productItems: ProductItem[];
  

  @IsNotEmpty()
  @IsOptional()
  expeditionId: Expedition;

  @IsNotEmpty()
  @IsOptional()
  expedition: Expedition;

}

