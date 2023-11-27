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
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetLocationsByAreaOptionsDto } from 'src/domain/dto/warehouses';
import { GetLocationsByAreaInput, GetLocationsByAreaOutput } from './dto';
import { GetLocationsByAreaService } from './get-locations-by-area.service';

@ApiTags('areas')
@Controller('areas')
export class GetLocationsByAreaController {
  constructor(
    private readonly _getLocationsByAreaService: GetLocationsByAreaService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':areaId/locations')
  @ApiResponse({
    status: 200,
    type: GetLocationsByAreaOutput,
  })
  async getLocationsByArea(
    @Param('areaId') areaId: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetLocationsByAreaOptionsDto,
  ): Promise<GetLocationsByAreaOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetLocationsByAreaInput = { areaId, pagination, options };
    return await this._getLocationsByAreaService.getLocationsByArea(input);
  }
}
