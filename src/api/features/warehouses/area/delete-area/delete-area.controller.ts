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
import { DeleteAreaService } from './delete-area.service';
import { DeleteAreaInput } from './dto';

@ApiTags('areas')
@Controller('area')
export class DeleteAreaController {
  constructor(private readonly _deleteAreaService: DeleteAreaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.AREAS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete(':areaId')
  @ApiResponse({
    status: 200,
    type: Boolean,
  })
  async deleteArea(
    @Param('areaId') areaId: string,
    @UserConnected() user: UserCon,
  ): Promise<boolean> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: DeleteAreaInput = { areaId };
    return await this._deleteAreaService.deleteArea(input, user);
  }
}
