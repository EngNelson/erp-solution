import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { AddStoragePointService } from './add-storage-point.service';
import { AddStoragePointInput } from './dto';

@ApiTags('storage-points')
@Controller('storage-points')
export class AddStoragePointController {
  constructor(
    private readonly _addStoragePointService: AddStoragePointService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.STORAGE_POINTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: StoragePointItemOutput,
  })
  async addStoragePoint(
    @Body() body: AddStoragePointInput,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<StoragePointItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._addStoragePointService.addStoragePoint(
      body,
      user,
      accessToken,
    );
  }
}
