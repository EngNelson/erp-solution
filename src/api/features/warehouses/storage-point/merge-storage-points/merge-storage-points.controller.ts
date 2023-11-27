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
import { StoragePointTreeOutput } from 'src/domain/dto/warehouses';
import { MergeStoragePointsInput } from './dto';
import { MergeStoragePointsService } from './merge-storage-points.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class MergeStoragePointsController {
  constructor(
    private readonly _mergeStoragePointsService: MergeStoragePointsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.STORAGE_POINTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.MERGE)
  @Put('/merge')
  @ApiResponse({
    status: 200,
    type: StoragePointTreeOutput,
  })
  async mergeStoragePoints(
    @Body() body: MergeStoragePointsInput,
    @UserConnected() user: UserCon,
  ): Promise<StoragePointTreeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._mergeStoragePointsService.mergeStoragePoints(body, user);
  }
}
