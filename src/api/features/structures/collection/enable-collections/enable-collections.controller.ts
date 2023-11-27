import {
  Body,
  Controller,
  NotFoundException,
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
import { EnableCollectionsInput, EnableCollectionsOutput } from './dto';
import { EnableCollectionsService } from './enable-collections.service';

@ApiTags('collections')
@Controller('collections')
export class EnableCollectionsController {
  constructor(
    private readonly _enableCollectionsService: EnableCollectionsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.COLLECCTIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.ENABLE)
  @Patch('enable')
  @ApiResponse({
    status: 200,
    type: EnableCollectionsOutput,
  })
  async enableCollections(
    @Body() body: EnableCollectionsInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<EnableCollectionsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.withChildrens = body.withChildrens ? body.withChildrens : false;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._enableCollectionsService.enableCollections(body, user);
  }
}
