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
import { DeleteMobileUnitService } from './delete-mobile-unit.service';
import { DeleteMobileUnitInput } from './dto';

@ApiTags('mobile-units')
@Controller('mobile-units')
export class DeleteMobileUnitController {
  constructor(
    private readonly _deleteMobileUnitService: DeleteMobileUnitService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.EXPEDITION_SUPERVISOR,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete()
  @ApiResponse({
    status: 201,
    type: Boolean,
  })
  async deleteMobileUnit(
    @Body() body: DeleteMobileUnitInput,
    @UserConnected() user: UserCon,
  ): Promise<boolean> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._deleteMobileUnitService.deleteMobileUnit(body, user);
  }
}
