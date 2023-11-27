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
import { DisableCategoriesService } from './disable-categories.service';
import { DisableCategoriesInput, DisableCategoriesOutput } from './dto';

@ApiTags('categories')
@Controller('categories')
export class DisableCategoriesController {
  constructor(
    private readonly _disableCategoriesService: DisableCategoriesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.CATEGORIES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DISABLE)
  @Patch('/disable')
  @ApiResponse({
    status: 200,
    type: DisableCategoriesOutput,
  })
  async disableCategories(
    @Body() body: DisableCategoriesInput,
    @UserConnected() user: UserCon,
  ): Promise<DisableCategoriesOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this._disableCategoriesService.disableCategories(body, user);
  }
}
