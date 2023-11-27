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
import { EnableCategoriesInput, EnableCategoriesOutput } from './dto';
import { EnableCategoriesService } from './enable-categories.service';

@ApiTags('categories')
@Controller('categories')
export class EnableCategoriesController {
  constructor(
    private readonly _enableCategoriesService: EnableCategoriesService,
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
  @RequirePrivileges(Abilities.MANAGE, Abilities.ENABLE)
  @Patch('/enable')
  @ApiResponse({
    status: 200,
    type: EnableCategoriesOutput,
  })
  async enableCategories(
    @Body() body: EnableCategoriesInput,
    @UserConnected() user: UserCon,
  ): Promise<EnableCategoriesOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    body.withChildrens = body.withChildrens ? body.withChildrens : false;
    return await this._enableCategoriesService.enableCategories(body, user);
  }
}
