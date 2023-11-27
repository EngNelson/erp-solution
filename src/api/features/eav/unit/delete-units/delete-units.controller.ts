import {
  Body,
  Controller,
  Delete,
  NotFoundException,
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
import { DeleteUnitsService } from './delete-units.service';
import { DeleteUnitsInput, DeleteUnitsOutput } from './dto';

@ApiTags('units')
@Controller('units')
export class DeleteUnitsController {
  constructor(private readonly _deleteUnitsService: DeleteUnitsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete()
  @ApiResponse({
    status: 200,
    type: DeleteUnitsOutput,
  })
  async deletUnits(
    @Body() body: DeleteUnitsInput,
    @UserConnected() user: UserCon,
  ): Promise<DeleteUnitsOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._deleteUnitsService.deleteUnits(body, user);
  }
}
