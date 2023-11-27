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
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { EditCollectionInput } from './dto';
import { EditCollectionService } from './edit-collection.service';

@ApiTags('collections')
@Controller('collections')
export class EditCollectionController {
  constructor(private readonly _editCollectionService: EditCollectionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.CONTENT,
  )
  @Ressource(ApiRessources.COLLECCTIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':collectionId')
  @ApiResponse({
    status: 200,
    type: CollectionItemOutput,
  })
  async editCollection(
    @Param('collectionId') id: string,
    @Body() body: EditCollectionInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CollectionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.collectionId = id;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._editCollectionService.editCollection(body, user);
  }
}
