import {
  Controller,
  Delete,
  NotFoundException,
  Param,
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
import { DeleteLocationService } from './delete-location.service';
import { DeleteLocationInput } from './dto';

@ApiTags('locations')
@Controller('locations')
export class DeleteLocationController {
  constructor(private readonly _deleteLocationService: DeleteLocationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete(':locationId')
  @ApiResponse({
    status: 200,
    type: Boolean,
  })
  async deleteLocation(
    @Param('locationId') locationId: string,
    @UserConnected() user: UserCon,
  ): Promise<boolean> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: DeleteLocationInput = { locationId };
    return await this._deleteLocationService.deleteLocation(input, user);
  }
}
