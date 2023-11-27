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
import { AttributeSetItemOutput } from 'src/domain/dto/items/eav';
import { EditAttributeSetInput } from './dto';
import { EditAttributeSetService } from './edit-attribute-set.service';

@ApiTags('attribute-sets')
@Controller('attribute-sets')
export class EditAttributeSetController {
  constructor(
    private readonly _editAttributeSetService: EditAttributeSetService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':attributeSetId')
  @ApiResponse({
    status: 201,
    type: AttributeSetItemOutput,
  })
  async editAttributeSet(
    @Param('attributeSetId') attributeSetId: string,
    @Body() body: EditAttributeSetInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AttributeSetItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.attributeSetId = attributeSetId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._editAttributeSetService.editAttributeSet(body, user);
  }
}
