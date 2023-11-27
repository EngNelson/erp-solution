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
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { GetLocationByIdInput } from './dto';
import { GetLocationByIdService } from './get-location-by-id.service';

@ApiTags('locations')
@Controller('locations')
export class GetLocationByIdController {
  constructor(
    private readonly _getLocationByIdService: GetLocationByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':locationId')
  @ApiResponse({
    status: 200,
    type: LocationItemOutput,
  })
  async getLocationById(
    @Param('locationId') locationId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<LocationItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetLocationByIdInput = {
      id: locationId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getLocationByIdService.getLocationById(input, user);
  }
}
