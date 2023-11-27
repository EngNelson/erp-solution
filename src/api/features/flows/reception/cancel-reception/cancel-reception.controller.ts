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
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { CancelReceptionService } from './cancel-reception.service';
import { CancelReceptionInput } from './dto';

@ApiTags('receptions')
@Controller('receptions')
export class CancelReceptionController {
  constructor(
    private readonly _cancelReceptionService: CancelReceptionService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch('/cancel/:receptionId')
  @ApiResponse({
    status: 200,
    type: ReceptionItemOutput,
  })
  async cancelReception(
    @Param('receptionId') receprionId: string,
    @Body() body: CancelReceptionInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ReceptionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.receptionId = receprionId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._cancelReceptionService.cancelReception(body, user);
  }
}
