import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { AttributeItemOutput } from 'src/domain/dto/items/eav';
import { AddAttributeService } from './add-attribute.service';
import { AddAttributeInput } from './dto';

@ApiTags('attributes')
@Controller('attributes')
export class AddAttributeController {
  constructor(private readonly _addAttributeService: AddAttributeService) {}

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
    type: AttributeItemOutput,
  })
  async addAttribute(
    @Body() body: AddAttributeInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AttributeItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addAttributeService.addAttribute(body, user);
  }
}
