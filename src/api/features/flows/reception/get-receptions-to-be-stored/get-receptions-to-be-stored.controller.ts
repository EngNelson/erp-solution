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
  GetReceptionsToBeStoredInput,
  GetReceptionsToBeStoredOutput,
} from './dto';
import { GetReceptionsToBeStoredService } from './get-receptions-to-be-stored.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetReceptionsToBeStoredController {
  constructor(
    private readonly _getReceptionsToBeStoredService: GetReceptionsToBeStoredService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/receptions/to-be-stored/:storagePointRef')
  @ApiResponse({
    status: 200,
    type: GetReceptionsToBeStoredOutput,
  })
  async getReceptionsToBeStored(
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Param('storagePointRef') storagePointRef?: string,
  ): Promise<GetReceptionsToBeStoredOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetReceptionsToBeStoredInput = {
      storagePointRef,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getReceptionsToBeStoredService.getReceptionsToBeStored(
      input,
      user,
    );
  }
}
