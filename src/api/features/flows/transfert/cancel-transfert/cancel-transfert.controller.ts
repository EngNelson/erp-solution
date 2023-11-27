import { Controller, Param, Patch, Query, UseGuards } from '@nestjs/common';
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
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import { CancelTransfertService } from './cancel-transfert.service';
import { CancelTransfertInput } from './dto';

@ApiTags('transferts')
@Controller('transferts')
export class CancelTransfertController {
  constructor(
    private readonly _cancelTransfertService: CancelTransfertService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch(':transfertId/cancel')
  @ApiResponse({
    status: 200,
    type: TransfertItemDetailsOutput,
  })
  async cancelTransfert(
    @Param('transfertId') transfertId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
    const input: CancelTransfertInput = {
      transfertId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._cancelTransfertService.cancelTransfert(input, user);
  }
}
