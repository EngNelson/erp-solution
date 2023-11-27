import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { RestoreCategoriesInput, RestoreCategoriesOutput } from './dto';
import { RestoreCategoriesService } from './restore-categories.service';

@ApiTags('categories')
@Controller('categories')
export class RestoreCategoriesController {
  constructor(
    private readonly _restoreCategoriesService: RestoreCategoriesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.CATEGORIES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.RESTORE)
  @Patch('restore')
  @ApiResponse({
    status: 200,
    type: RestoreCategoriesOutput,
  })
  async restoreCAtegories(
    @Body() body: RestoreCategoriesInput,
    @UserConnected() user: UserCon,
  ): Promise<RestoreCategoriesOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this._restoreCategoriesService.restoreCategories(body, user);
  }
}
