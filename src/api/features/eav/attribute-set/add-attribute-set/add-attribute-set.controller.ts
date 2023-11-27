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
import { AddAttributeSetService } from './add-attribute-set.service';
import { AddAttributeSetInput, AddAttributeSetOutput } from './dto';

@ApiTags('attribute-sets')
@Controller('attribute-sets')
export class AddAttributeSetController {
  constructor(
    private readonly _addAttributeSetService: AddAttributeSetService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: AddAttributeSetOutput,
  })
  async addAttributeSet(
    @Body() body: AddAttributeSetInput,
    @UserConnected() user: UserCon,
  ): Promise<AddAttributeSetOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._addAttributeSetService.addAttributeSet(body, user);
  }
}
