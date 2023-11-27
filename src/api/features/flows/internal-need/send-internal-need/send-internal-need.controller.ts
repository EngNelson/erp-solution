import {
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UnauthorizedException,
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
import { SendInternalNeedInput } from './dto';
import { SendInternalNeedService } from './send-internal-need.service';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class SendInternalNeedController {
  constructor(
    private readonly _sendInternalNeedService: SendInternalNeedService,
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
    AgentRoles.SAV_MANAGER,
  )
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('send/:internalNeedId')
  @ApiResponse({
    status: 201,
    type: InternalNeedItemOutput,
  })
  async sendInternalNeed(
    @Param('internalNeedId') internalNeedId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<InternalNeedItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: SendInternalNeedInput = {
      internalNeedId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._sendInternalNeedService.sendInternalNeed(
      input,
      user,
      accessToken,
    );
  }
}
