import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
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
import { StoragePointItemOutput } from 'src/domain/dto/warehouses';
import { EditStoragePointInput } from './dto';
import { EditStoragePointService } from './edit-storage-point.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class EditStoragePointController {
  constructor(
    private readonly _editStoragePointService: EditStoragePointService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.STORAGE_POINTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':storagePointId')
  @ApiResponse({
    status: 200,
    type: StoragePointItemOutput,
  })
  async editStoragePoint(
    @Param('storagePointId') storagePointId: string,
    @Body() body: EditStoragePointInput,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<StoragePointItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    body.storagePointId = storagePointId;
    return await this._editStoragePointService.editStoragePoint(
      body,
      user,
      accessToken,
    );
  }
}
