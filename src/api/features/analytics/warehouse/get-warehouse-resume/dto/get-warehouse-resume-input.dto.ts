import { IsISOLang, ISOLang } from '@glosuite/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { TransfertStatus } from 'src/domain/enums/flows';
import { PurchaseOrderType } from 'src/domain/enums/purchases';

export class GetWarehouseResumeInput {
  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  startDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  endDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  specificDate?: Date;

  @IsOptional()
  @ApiPropertyOptional({
    type: 'enum',
    enum: PurchaseOrderType,
  })
  purchaseOrderType?: PurchaseOrderType;

  @IsOptional()
  @ApiPropertyOptional({
    type: 'enum',
    enum: TransfertStatus,
  })
  transfertStatus?: TransfertStatus;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
