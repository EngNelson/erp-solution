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
import { AreaItemOutput } from 'src/domain/dto/warehouses';
import { AddAreaService } from './add-area.service';
import { AddAreaInput } from './dto';

@ApiTags('areas')
@Controller('areas')
export class AddAreaController {
  constructor(private readonly _addAreaService: AddAreaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.AREAS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: AreaItemOutput,
  })
  async addArea(
    @Body() body: AddAreaInput,
    @UserConnected() user: UserCon,
  ): Promise<AreaItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._addAreaService.addArea(body, user);
  }
}
