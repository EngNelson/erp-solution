import {
  Body,
  Controller,
  Delete,
  NotFoundException,
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
import { DeleteCategoriesService } from './delete-categories.service';
import { DeleteCategoriesInput, DeleteCategoriesOutput } from './dto';

@ApiTags('categories')
@Controller('categories')
export class DeleteCategoriesController {
  constructor(
    private readonly _deleteCategoryService: DeleteCategoriesService,
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
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete()
  @ApiResponse({
    status: 200,
    type: DeleteCategoriesOutput,
  })
  async deleteCategory(
    @Body() body: DeleteCategoriesInput,
    @UserConnected() user: UserCon,
  ): Promise<DeleteCategoriesOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._deleteCategoryService.deleteCategories(body, user);
  }
}
