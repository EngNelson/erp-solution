import {
  Body,
  Controller,
  NotFoundException,
  Param,
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
import { AttributeItemOutput } from 'src/domain/dto/items/eav';
import { EditAttributeInput } from './dto';
import { EditAttributeService } from './edit-attribute.service';

@ApiTags('attributes')
@Controller('attributes')
export class EditAttributeController {
  constructor(private readonly _editAttributeService: EditAttributeService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':attributeId')
  @ApiResponse({
    status: 201,
    type: AttributeItemOutput,
  })
  async editAttribute(
    @Param('attributeId') attributeId: string,
    @Body() body: EditAttributeInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AttributeItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.attributeId = attributeId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._editAttributeService.editAttribute(body, user);
  }
}
