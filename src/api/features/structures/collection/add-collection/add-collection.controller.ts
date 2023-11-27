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
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { AddCollectionService } from './add-collection.service';
import { AddCollectionInput } from './dto';

@ApiTags('collections')
@Controller('collections')
export class AddCollectionController {
  constructor(private readonly _addCollectionService: AddCollectionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CATMAN)
  @Ressource(ApiRessources.COLLECCTIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: CollectionItemOutput,
  })
  async addCollection(
    @Body() body: AddCollectionInput,
    @UserConnected() user: UserCon,
  ): Promise<CollectionItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._addCollectionService.addCollection(body, user);
  }
}
