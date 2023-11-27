import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { GetInventoriesOptionsDto } from 'src/domain/dto/flows';

export class GetStoragePointInventoriesInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

  options: GetInventoriesOptionsDto;
}
