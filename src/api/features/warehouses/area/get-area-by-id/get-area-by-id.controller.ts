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
import { AreaItemOutput } from 'src/domain/dto/warehouses';
import { GetAreaByIdInput } from './dto';
import { GetAreaByIdService } from './get-area-by-id.service';

@ApiTags('areas')
@Controller('areas')
export class GetAreaByIdController {
  constructor(private readonly _getAreaByIdService: GetAreaByIdService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':areaId')
  @ApiResponse({
    status: 200,
    type: AreaItemOutput,
  })
  async getAreaById(
    @Param('areaId') areaId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AreaItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetAreaByIdInput = {
      id: areaId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getAreaByIdService.getAreaById(input, user);
  }
}
