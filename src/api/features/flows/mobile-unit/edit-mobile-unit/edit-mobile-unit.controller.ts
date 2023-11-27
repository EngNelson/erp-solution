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
import { MobileUnitItemOutput } from 'src/domain/dto/flows';
import { EditMobileUnitInput } from './dto';
import { EditMobileUnitService } from './edit-mobile-unit.service';

@ApiTags('mobile-units')
@Controller('mobile-units')
export class EditMobileUnitController {
  constructor(private readonly _editMobileUnitService: EditMobileUnitService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.RECEIVER,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':mobileUnitId')
  @ApiResponse({
    status: 201,
    type: MobileUnitItemOutput,
  })
  async editMobileUnit(
    @Param('mobileUnitId') mobileUnitId: string,
    @Body() body: EditMobileUnitInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<MobileUnitItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.mobileUnitId = mobileUnitId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._editMobileUnitService.editMobileUnit(body, user);
  }
}
