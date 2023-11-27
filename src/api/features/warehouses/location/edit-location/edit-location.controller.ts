import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
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
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { EditLocationInput } from './dto';
import { EditLocationService } from './edit-location.service';

@ApiTags('locations')
@Controller('locations')
export class EditLocationController {
  constructor(private readonly _editLocationService: EditLocationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':locationId')
  @ApiResponse({
    status: 200,
    type: EditLocationInput,
  })
  async editLocation(
    @Param('locationId') locationId: string,
    @Body() body: EditLocationInput,
    @UserConnected() user: UserCon,
  ): Promise<LocationItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    body.locationId = locationId;
    return await this._editLocationService.editLocation(body, user);
  }
}
