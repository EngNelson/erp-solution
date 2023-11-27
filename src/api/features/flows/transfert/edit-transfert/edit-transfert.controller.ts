import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EditTransfertService } from './edit-transfert.service';
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import { EditTransfertInput } from './dto';
import {
  Roles,
  AgentRoles,
  Ressource,
  ApiRessources,
  RequirePrivileges,
  Abilities,
  UserConnected,
  UserCon,
} from '@glosuite/shared';
import { JwtAuthGuard, RolesGuard, PermissionsGuard } from 'src/api/guards';

@ApiTags('transferts')
@Controller('transferts')
export class EditTransfertController {
  constructor(private readonly _editTransfertService: EditTransfertService) {}

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
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/edit/:reference')
  @ApiResponse({
    status: 201,
    type: TransfertItemDetailsOutput,
  })
  async editOtherOutput(
    @Param('reference') reference: string,
    @Body() body: EditTransfertInput,
    @UserConnected() user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.reference = reference;

    return await this._editTransfertService.editTransfert(body, user);
  }
}
