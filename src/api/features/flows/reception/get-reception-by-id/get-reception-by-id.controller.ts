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
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { GetReceptionByIdInput } from './dto';
import { GetReceptionByIdService } from './get-reception-by-id.service';

@ApiTags('receptions')
@Controller('receptions')
export class GetReceptionByIdController {
  constructor(
    private readonly _getReceptionByIdService: GetReceptionByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':receptionId')
  @ApiResponse({
    status: 200,
    type: ReceptionItemOutput,
  })
  async getReceptionById(
    @Param('receptionId') receptionId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ReceptionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetReceptionByIdInput = {
      receptionId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getReceptionByIdService.getReceptionById(input, user);
  }
}
