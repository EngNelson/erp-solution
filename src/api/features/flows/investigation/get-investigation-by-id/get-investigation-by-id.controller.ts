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
import { InvestigationItemOutput } from 'src/domain/dto/flows';
import { GetInvestigationByIdInput } from './dto';
import { GetInvestigationByIdService } from './get-investigation-by-id.service';

@ApiTags('investigations')
@Controller('investigations')
export class GetInvestigationByIdController {
  constructor(
    private readonly _getInvestigationByIdService: GetInvestigationByIdService,
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
    AgentRoles.ACCOUNTING,
    AgentRoles.TREASURY,
    AgentRoles.DAF,
    AgentRoles.DG,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':investigationId')
  @ApiResponse({
    status: 200,
    type: InvestigationItemOutput,
  })
  async getInvestigationById(
    @Param('investigationId') investigationId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InvestigationItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetInvestigationByIdInput = {
      investigationId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getInvestigationByIdService.getInvestigationById(
      input,
      user,
    );
  }
}
