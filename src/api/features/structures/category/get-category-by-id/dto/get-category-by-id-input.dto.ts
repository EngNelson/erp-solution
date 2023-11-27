import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { GetOptionsInput, IsISOLang, ISOLang } from '@glosuite/shared';

export class GetCategoryByIdInput {
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsISOLang()
  lang?: ISOLang;

  options?: GetOptionsInput;
}
