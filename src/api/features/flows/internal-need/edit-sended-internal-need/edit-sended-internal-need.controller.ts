import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  ISOLandDto,
  ISOLang,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { EditSendedInternalNeedInput } from './dto';
import { EditSendedInternalNeedService } from './edit-sended-internal-need.service';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class EditSendedInternalNeedController {
  constructor(
    private readonly _editSendedInternalNeedService: EditSendedInternalNeedService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.ACCOUNTING,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.DAF,
    AgentRoles.DG,
    AgentRoles.GUEST_USER,
    AgentRoles.SAV_MANAGER,
  )
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/to-verify/:internalNeedId')
  @ApiResponse({
    status: 201,
    type: InternalNeedItemOutput,
  })
  async editSendedInternalNeed(
    @Param('internalNeedId') internalNeedId: string,
    @Body() body: EditSendedInternalNeedInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InternalNeedItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.internalNeedId = internalNeedId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._editSendedInternalNeedService.editSendedInternalNeed(
      body,
      user,
    );
  }
}
