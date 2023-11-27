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
import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { GetTransfertsVariantsInput, GetTransfertsVariantsOutput } from './dto';
import { GetTransfertsVariantsService } from './get-transferts-variants.service';

@ApiTags('transferts')
@Controller('transferts')
export class GetTransfertsVariantsController {
  constructor(
    private readonly _getTransfertsVariantsService: GetTransfertsVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.TRANSFERT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('report/variants')
  @ApiResponse({
    status: 200,
    type: GetTransfertsVariantsOutput,
  })
  async getTransfertsVariants(
    @Query() body: GetTransfertsVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<GetTransfertsVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    if (!body.lang) {
      body.lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
    }

    return await this._getTransfertsVariantsService.getTransfertsVariants(
      body,
      user,
    );
  }
}
