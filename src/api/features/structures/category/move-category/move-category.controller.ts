import {
  Controller,
  NotFoundException,
  Param,
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
import { MoveCategoryInput } from './dto';
import { MoveCategoryService } from './move-category.service';

@ApiTags('categories')
@Controller('categories')
export class MoveCategoryController {
  constructor(private readonly _moveCategoryService: MoveCategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.CATEGORIES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.MOVE)
  @Patch(':categoryId/move-to/:targetCategoryId')
  @ApiResponse({
    status: 200,
    type: Boolean,
  })
  moveCategory(
    @Param('categoryId') categoryId: string,
    @Param('targetCategoryId') targetCategoryId: string,
    @UserConnected() user: UserCon,
  ) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: MoveCategoryInput = { categoryId, targetCategoryId };
    return this._moveCategoryService.moveCategory(input, user);
  }
}
