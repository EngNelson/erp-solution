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
import { MobileUnitItemOutput, PasswordDto } from 'src/domain/dto/flows';
import { GetMobileUnitByIdInput } from './dto';
import { GetMobileUnitByIdService } from './get-mobile-unit-by-id.service';

@ApiTags('mobile-units')
@Controller('mobile-units')
export class GetMobileUnitByIdController {
  constructor(
    private readonly _getMobileUnitByIdService: GetMobileUnitByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PICK_PACK,
    AgentRoles.STOCK_AGENT,
    AgentRoles.RECEIVER,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.EXPEDITION_SUPERVISOR,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':mobileUnitId')
  @ApiResponse({
    status: 201,
    type: MobileUnitItemOutput,
  })
  async getMobileUnitById(
    @Param('mobileUnitId') mobileUnitId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Query() passwordDto?: PasswordDto,
  ): Promise<MobileUnitItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetMobileUnitByIdInput = {
      mobileUnitId,
      password: passwordDto.password,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getMobileUnitByIdService.getMobileUnitById(input, user);
  }
}
