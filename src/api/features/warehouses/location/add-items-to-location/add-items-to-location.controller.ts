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
import { AddItemsToLocationService } from './add-items-to-location.service';
import { AddItemsToLocationInput, AddItemsToLocationOutput } from './dto';

@ApiTags('locations')
@Controller('locations')
export class AddItemsToLocationController {
  constructor(
    private readonly _addItemsToLocationService: AddItemsToLocationService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/entreposage/:locationId')
  @ApiResponse({
    status: 200,
    type: AddItemsToLocationOutput,
  })
  async addItemsToLocation(
    @Param('locationId') locationId: string,
    @Body() body: AddItemsToLocationInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AddItemsToLocationOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.locationId = locationId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addItemsToLocationService.addItemsToLocation(body, user);
  }
}
