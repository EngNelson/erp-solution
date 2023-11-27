import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetOtherOutputsVariantsService } from './get-other-outputs-variants.service';
import {
  GetOtherOutputsVariantsInput,
  GetOtherOutputsVariantsOutput,
} from './dto';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  ISOLang,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class GetOtherOutputsVariantsController {
  constructor(
    private readonly _getOtherOutputsVariantsService: GetOtherOutputsVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.OTHER_OUTPUT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('report/variants')
  @ApiResponse({
    status: 200,
    type: GetOtherOutputsVariantsOutput,
  })
  async getOtherOutputsVariants(
    @Query() body: GetOtherOutputsVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<GetOtherOutputsVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    if (!body.lang) {
      body.lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
    }

    return await this._getOtherOutputsVariantsService.getOtherOutputsVariants(
      body,
      user,
    );
  }
}
