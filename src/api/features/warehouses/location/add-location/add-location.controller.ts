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
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { AddLocationService } from './add-location.service';
import { AddLocationInput } from './dto';

@ApiTags('locations')
@Controller('locations')
export class AddLocationController {
  constructor(private readonly _addLocationService: AddLocationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: LocationItemOutput,
  })
  async addLocation(
    @Body() body: AddLocationInput,
    @UserConnected() user: UserCon,
  ): Promise<LocationItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._addLocationService.addLocation(body, user);
  }
}
