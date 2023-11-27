import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EditReceptionService } from './edit-reception.service';
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
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { EditOtherOutputInput } from '../../other-output/edit-other-output/dto';

@ApiTags('receptions')
@Controller('receptions')
export class EditReceptionController {
  constructor(private readonly _editReceptionService: EditReceptionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/edit/:reference')
  @ApiResponse({
    status: 201,
    type: ReceptionItemOutput,
  })
  async addReception(
    @Param('reference') reference: string,
    @Body() body: EditOtherOutputInput,
    @UserConnected() user: UserCon,
  ): Promise<ReceptionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.reference = reference;

    return await this._editReceptionService.editReception(body, user);
  }
}
