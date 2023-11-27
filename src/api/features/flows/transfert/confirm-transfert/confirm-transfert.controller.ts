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
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import { ConfirmTransfertService } from './confirm-transfert.service';
import { ConfirmTransfertInput } from './dto';

@ApiTags('transferts')
@Controller('transferts')
export class ConfirmTransfertController {
  constructor(
    private readonly _confirmTransfertRepository: ConfirmTransfertService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CONFIRM)
  @Patch(':transfertId/confirm')
  @ApiResponse({
    status: 200,
    type: TransfertItemDetailsOutput,
  })
  async confirmTransfert(
    @Param('transfertId') transfertId: string,
    @Body() body: ConfirmTransfertInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.transfertId = transfertId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._confirmTransfertRepository.confirmTransfert(body, user);
  }
}
