import {
  Body,
  Controller,
  NotFoundException,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { LocationTreeOutput } from 'src/domain/dto/warehouses';
import { MergeLocationsInput } from './dto';
import { MergeLocationsService } from './merge-locations.service';

@ApiTags('locations')
@Controller('locations')
export class MergeLocationsController {
  constructor(private readonly _mergeLocationsService: MergeLocationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.MERGE)
  @Put('/merge')
  @ApiResponse({
    status: 200,
    type: LocationTreeOutput,
  })
  async mergeLocations(
    @Body() body: MergeLocationsInput,
    @UserConnected() user: UserCon,
  ): Promise<LocationTreeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._mergeLocationsService.mergeLocations(body, user);
  }
}
