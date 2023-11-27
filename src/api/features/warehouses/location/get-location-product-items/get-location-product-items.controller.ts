import {
  Controller,
  Get,
  NotFoundException,
  Param,
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
import {
  GetLocationProductItemsInput,
  GetLocationProductItemsOutput,
} from './dto';
import { GetLocationProductItemsService } from './get-location-product-items.service';

@ApiTags('locations')
@Controller('locations')
export class GetLocationProductItemsController {
  constructor(
    private readonly _getLocationProductItemsService: GetLocationProductItemsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':locationId/product-items')
  @ApiResponse({
    status: 200,
    type: GetLocationProductItemsOutput,
  })
  async getLocationProductItems(
    @Param('locationId') locationId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<GetLocationProductItemsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetLocationProductItemsInput = {
      locationId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getLocationProductItemsService.getLocationProductItems(
      input,
      user,
    );
  }
}
