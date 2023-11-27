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
import { InvestigationItemOutput } from 'src/domain/dto/flows';
import { CloseInvestigationService } from './close-investigation.service';
import { CloseInvestigationInput } from './dto';

@ApiTags('investigations')
@Controller('investigations')
export class CloseInvestigationController {
  constructor(
    private readonly _closeInvestigationService: CloseInvestigationService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.TREASURY,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/close/:investigationId')
  @ApiResponse({
    status: 201,
    type: InvestigationItemOutput,
  })
  async closeInvestigation(
    @Param('investigationId') investigationId: string,
    @Body() body: CloseInvestigationInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InvestigationItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.investigationId = investigationId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._closeInvestigationService.closeInvestigation(body, user);
  }
}
