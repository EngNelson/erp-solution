import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { StepStatus } from 'src/domain/enums/flows';

export class GetOrdersVariantsInput {
  @IsNotEmpty()
  @ApiProperty()
  specificDate: Date;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @IsEnum(StepStatus)
  @ApiPropertyOptional({
    enum: StepStatus,
  })
  orderStatus?: StepStatus;

  @IsOptional()
  @IsISOLang()
  @ApiPropertyOptional({
    enum: ISOLang,
    default: ISOLang.FR,
  })
  lang?: ISOLang;
}
