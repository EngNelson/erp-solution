import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import {
  ArrayContainsUniqueValue,
  CompanyService,
  Department,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { EmployeeInput } from 'src/domain/dto';
import { VariantNeededInput } from 'src/domain/dto/flows';
import { InternalNeedUsage } from 'src/domain/enums/flows';
import { Employee } from 'src/domain/interfaces';
import { VariantNeededType } from 'src/domain/types/flows';

export class AddInternalNeedInput {
  @IsNotEmpty()
  @IsEnum(InternalNeedUsage)
  @ApiProperty({ enum: InternalNeedUsage })
  usage: InternalNeedUsage;

  // if usage = FOR_SERVICE
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.usage === InternalNeedUsage.FOR_SERVICE ||
      o.usage === InternalNeedUsage.FOR_DEPARTMENT,
  )
  @IsNotEmpty()
  @IsEnum(CompanyService)
  @ApiProperty({ enum: CompanyService })
  service?: CompanyService;

  // if usage = FOR_DEPARTMENT
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.usage === InternalNeedUsage.FOR_DEPARTMENT ||
      o.usage === InternalNeedUsage.FOR_EMPLOYEE,
  )
  @IsNotEmpty()
  @IsEnum(Department)
  @ApiProperty({ enum: Department })
  department?: Department;

  // if usage = FOR_EMPLOYEE
  @IsOptional()
  @ValidateIf((o) => o.usage === InternalNeedUsage.FOR_EMPLOYEE)
  @IsNotEmpty()
  @ApiProperty({ type: EmployeeInput })
  employee?: Employee;

  @IsNotEmpty()
  @IsNotEmptyObject()
  @ApiProperty()
  addressTo: UserCon;

  @IsNotEmpty()
  @ApiProperty()
  reason: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  sendMail: boolean;

  /**
   * Variants added on purchase order
   */
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    isArray: true,
    type: VariantNeededInput,
  })
  variantNeededs: VariantNeededType[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
