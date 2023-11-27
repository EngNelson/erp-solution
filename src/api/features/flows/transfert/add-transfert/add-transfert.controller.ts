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
import { TransfertItemOutput } from 'src/domain/dto/flows/transfert-item-output.dto';
import { AddTransfertService } from './add-transfert.service';
import { AddTransfertInput } from './dto';

@ApiTags('transferts')
@Controller('transferts')
export class AddTransfertController {
  constructor(private readonly _addTransfertService: AddTransfertService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.EXPEDITION_SUPERVISOR,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: TransfertItemOutput,
  })
  async addTransfert(
    @Body() body: AddTransfertInput,
    @UserConnected() user: UserCon,
  ): Promise<TransfertItemOutput> {
    return await this._addTransfertService.addTransfert(body, user);
  }
}
