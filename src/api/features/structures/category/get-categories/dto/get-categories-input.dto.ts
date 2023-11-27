import { IsOptional } from 'class-validator';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { GetCategoriesOptionsDto } from 'src/domain/dto/structures';

export class GetCategoriesInput {
  @IsOptional()
  @IsISOLang()
  lang?: ISOLang;

  options?: GetCategoriesOptionsDto;
}
