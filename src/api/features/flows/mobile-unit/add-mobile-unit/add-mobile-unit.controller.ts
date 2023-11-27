import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
import { MobileUnitItemOutput } from 'src/domain/dto/flows';
import { AddMobileUnitService } from './add-mobile-unit.service';
import { AddMobileUnitInput } from './dto';

@ApiTags('mobile-units')
@Controller('mobile-units')
export class AddMobileUnitController {
  constructor(private readonly _addMobileUnitService: AddMobileUnitService) {}

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
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: MobileUnitItemOutput,
  })
  async addMobileUnit(
    @Body() body: AddMobileUnitInput,
    @UserConnected() user: UserCon,
  ): Promise<MobileUnitItemOutput> {
    return await this._addMobileUnitService.addMobileUnit(body, user);
  }
}
