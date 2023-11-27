import {
  Body,
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
import { CategoryItemOutput } from 'src/domain/dto/structures';
import { EditCategoryInput } from './dto';
import { EditCategoryService } from './edit-category.service';

@ApiTags('categories')
@Controller('categories')
export class EditCategoryController {
  constructor(private readonly _editCategoryService: EditCategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.CATEGORIES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':categoryId')
  @ApiResponse({
    status: 200,
    type: CategoryItemOutput,
  })
  async editCategory(
    @Param('categoryId') id: string,
    @Body() body: EditCategoryInput,
    @UserConnected() user: UserCon,
  ) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    body.categoryId = id;
    return await this._editCategoryService.editCategory(body, user);
  }
}
