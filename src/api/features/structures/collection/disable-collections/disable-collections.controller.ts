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
import { DisableCollectionsService } from './disable-collections.service';
import { DisableCollectionsInput, DisableCollectionsOutput } from './dto';

@ApiTags('collections')
@Controller('collections')
export class DisableCollectionsController {
  constructor(
    private readonly _disableCollectionsService: DisableCollectionsService,
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
  @RequirePrivileges(Abilities.MANAGE, Abilities.DISABLE)
  @Patch('disable')
  @ApiResponse({
    status: 200,
    type: DisableCollectionsOutput,
  })
  async disableCollections(
    @Body() body: DisableCollectionsInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<DisableCollectionsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._disableCollectionsService.disableCollections(body, user);
  }
}
