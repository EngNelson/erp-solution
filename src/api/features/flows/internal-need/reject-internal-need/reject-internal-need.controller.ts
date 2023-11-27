import {
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
import { RejectInternalNeedInput } from './dto';
import { RejectInternalNeedService } from './reject-internal-need.service';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class RejectInternalNeedController {
  constructor(
    private readonly _rejectInternalNeedService: RejectInternalNeedService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.DG, AgentRoles.DAF, AgentRoles.SUPER_ADMIN)
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/reject/:internalNeedId')
  @ApiResponse({
    status: 201,
    type: InternalNeedItemOutput,
  })
  async rejectInternalNeed(
    @Param('internalNeedId') internalNeedId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InternalNeedItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: RejectInternalNeedInput = {
      internalNeedId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._rejectInternalNeedService.rejectInternalNeed(
      input,
      user,
    );
  }
}
