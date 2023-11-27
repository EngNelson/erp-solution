import {
  Controller,
  Delete,
  NotFoundException,
  Param,
  Req,
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
import { DeleteStoragePointService } from './delete-storage-point.service';
import { DeleteStoragePointInput } from './dto';

@ApiTags('storage-points')
@Controller('storage-points')
export class DeleteStoragePointController {
  constructor(
    private readonly _deleteStoragePointService: DeleteStoragePointService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.STORAGE_POINTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete(':storagePointId')
  @ApiResponse({
    status: 200,
    type: Boolean,
  })
  async deleteStoragePoint(
    @Param('storagePointId') storagePointId: string,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<boolean> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    const input: DeleteStoragePointInput = { storagePointId };
    return await this._deleteStoragePointService.deleteStoragePoint(
      input,
      user,
      accessToken,
    );
  }
}
