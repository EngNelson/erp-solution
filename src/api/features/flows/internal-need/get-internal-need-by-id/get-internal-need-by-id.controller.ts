import {
  Controller,
  Get,
  NotFoundException,
  Param,
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
import { GetInternalNeedByIdInput } from './dto';
import { GetInternalNeedByIdService } from './get-internal-need-by-id.service';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class GetInternalNeedByIdController {
  constructor(
    private readonly _getInternalNeedByIdService: GetInternalNeedByIdService,
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
    AgentRoles.PROCUREMENT_SUPPLY,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    AgentRoles.DAF,
    AgentRoles.DG,
    AgentRoles.GUEST_USER,
    AgentRoles.SAV_MANAGER,
  )
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':internalNeedId')
  @ApiResponse({
    status: 201,
    type: InternalNeedItemOutput,
  })
  async getInternalNeedById(
    @Param('internalNeedId') internalNeedId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InternalNeedItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetInternalNeedByIdInput = {
      internalNeedId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getInternalNeedByIdService.getInternalNeedById(
      input,
      user,
    );
  }
}
