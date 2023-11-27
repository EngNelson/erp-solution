import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { AddCategoryService } from './add-category.service';
import { AddCategoryInput } from './dto';

@ApiTags('categories')
@Controller('categories')
export class AddCategoryController {
  constructor(private readonly _addCategoryService: AddCategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.CATEGORIES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: CategoryItemOutput,
  })
  async addCategory(
    @Body() body: AddCategoryInput,
    @UserConnected() user: UserCon,
  ) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._addCategoryService.addCategory(body, user);
  }
}
