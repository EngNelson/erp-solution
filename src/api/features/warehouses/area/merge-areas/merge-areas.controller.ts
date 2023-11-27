import {
  Body,
  Controller,
  NotFoundException,
  Put,
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
import { AreaTreeOutput } from 'src/domain/dto/warehouses';
import { MergeAreasInput } from './dto';
import { MergeAreasService } from './merge-areas.service';

@ApiTags('areas')
@Controller('areas')
export class MergeAreasController {
  constructor(private readonly _mergeAreasService: MergeAreasService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.AREAS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.MERGE)
  @Put('/merge')
  @ApiResponse({
    status: 200,
    type: AreaTreeOutput,
  })
  async mergeAreas(
    @Body() body: MergeAreasInput,
    @UserConnected() user: UserCon,
  ): Promise<AreaTreeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._mergeAreasService.mergeAreas(body, user);
  }
}
