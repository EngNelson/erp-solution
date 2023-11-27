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
import { LocationTreeOutput } from 'src/domain/dto/warehouses';
import { GetLocationTreeByIdInput } from './dto';
import { GetLocationTreeByIdService } from './get-location-tree-by-id.service';

@ApiTags('locations')
@Controller('locations')
export class GetLocationTreeByIdController {
  constructor(
    private readonly _getLocationTreeByIdService: GetLocationTreeByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':locationId/tree')
  @ApiResponse({
    status: 200,
    type: LocationTreeOutput,
  })
  async getLocationTreeById(
    @Param('locationId') locationId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<LocationTreeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetLocationTreeByIdInput = {
      locationId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getLocationTreeByIdService.getLocationTreeById(
      input,
      user,
    );
  }
}
