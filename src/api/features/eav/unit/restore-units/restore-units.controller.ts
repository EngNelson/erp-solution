import {
  Body,
  Controller,
  NotFoundException,
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
import { RestoreUnitsInput, RestoreUnitsOutput } from './dto';
import { RestoreUnitsService } from './restore-units.service';

@ApiTags('units')
@Controller('units')
export class RestoreUnitsController {
  constructor(private readonly _restoreUnitsService: RestoreUnitsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.RESTORE)
  @Patch('restore')
  @ApiResponse({
    status: 200,
    type: RestoreUnitsOutput,
  })
  async restoreUnits(
    @Body() body: RestoreUnitsInput,
    @UserConnected() user: UserCon,
  ): Promise<RestoreUnitsOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._restoreUnitsService.restoreUnits(body, user);
  }
}
