import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { InvestigationStatus } from 'src/domain/enums/flows';

export class CloseInvestigationInput {
  @IsNotEmpty()
  @ApiProperty()
  investigationId: string;

  @IsNotEmpty()
  @ApiProperty()
  comment: string;

  @IsNotEmpty()
  @IsEnum(InvestigationStatus)
  @ApiProperty({
    enum: InvestigationStatus,
  })
  newStatus: InvestigationStatus; // this new status cannot be PENDING

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
