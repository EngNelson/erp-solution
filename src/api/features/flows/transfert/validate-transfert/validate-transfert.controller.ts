import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
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
import { ValidateTransfertInput } from './dto';
import { ValidateTransfertService } from './validate-transfert.service';

@ApiTags('transferts')
@Controller('transferts')
export class ValidateTransfertController {
  constructor(
    private readonly _validateTransfertService: ValidateTransfertService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.EXPEDITION_SUPERVISOR,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch(':transfertId/validate')
  @ApiResponse({
    status: 200,
    type: TransfertItemDetailsOutput,
  })
  async validateTransfert(
    @Param('transfertId') transfertId: string,
    @Body() body: ValidateTransfertInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
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

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._validateTransfertService.validateTransfert(
      body,
      user,
      accessToken,
    );
  }
}
