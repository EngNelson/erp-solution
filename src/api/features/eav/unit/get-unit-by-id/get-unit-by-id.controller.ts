import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { UnitItemOutput } from 'src/domain/dto/items/eav';
import { GetUnitByIdInput } from './dto';
import { GetUnitByIdService } from './get-unit-by-id.service';

@ApiTags('units')
@Controller('units')
export class GetUnitByIdController {
  constructor(private readonly _getUnitByIdService: GetUnitByIdService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':unitId')
  @ApiResponse({
    status: 200,
    type: UnitItemOutput,
  })
  async getUnitById(
    @Param('unitId') unitId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<UnitItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetUnitByIdInput = {
      unitId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getUnitByIdService.getUnitById(input, user);
  }
}
