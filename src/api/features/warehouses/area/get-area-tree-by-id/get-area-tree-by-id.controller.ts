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
import { AreaTreeOutput } from 'src/domain/dto/warehouses';
import { GetAreaTreeByIdInput } from './dto';
import { GetAreaTreeByIdService } from './get-area-tree-by-id.service';

@ApiTags('areas')
@Controller('areas')
export class GetAreaTreeByIdController {
  constructor(
    private readonly _getAreaTreeByIdService: GetAreaTreeByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':areaId/tree')
  @ApiResponse({
    status: 200,
    type: AreaTreeOutput,
  })
  async getAreaTreeById(
    @Param('areaId') areaId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AreaTreeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetAreaTreeByIdInput = {
      areaId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getAreaTreeByIdService.getAreaTreeById(input);
  }
}
