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
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { GetReceptionsVariantsInput, GetReceptionsVariantsOutput } from './dto';
import { GetReceptionsVariantsService } from './get-receptions-variants.service';

@ApiTags('receptions')
@Controller('receptions')
export class GetReceptionsVariantsController {
  constructor(
    private readonly _getReceptionsVariantsService: GetReceptionsVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('report/variants')
  @ApiResponse({
    status: 200,
    type: GetReceptionsVariantsOutput,
  })
  async getReceptionsVariants(
    @Query() body: GetReceptionsVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<GetReceptionsVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    if (!body.lang) {
      body.lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
    }

    return await this._getReceptionsVariantsService.getReceptionsVariants(
      body,
      user,
    );
  }
}
