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
import { GetInventoriesOptionsDto } from 'src/domain/dto/flows';
import {
  GetStoragePointInventoriesInput,
  GetStoragePointInventoriesOutput,
} from './dto';
import { GetStoragePointInventoriesService } from './get-storage-point-inventories.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetStoragePointInventoriesController {
  constructor(
    private readonly _getStoragePointInventoriesServices: GetStoragePointInventoriesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/inventories/:storagePointId')
  @ApiResponse({
    status: 200,
    type: GetStoragePointInventoriesOutput,
  })
  async getStoragePointInventories(
    @Param('storagePointId') storagePointId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetInventoriesOptionsDto,
  ): Promise<GetStoragePointInventoriesOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetStoragePointInventoriesInput = {
      storagePointId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
      options,
    };
    return await this._getStoragePointInventoriesServices.getStoragePointInventories(
      input,
      user,
    );
  }
}
