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
import { PickingListItemOutput } from 'src/domain/dto/flows';
import { GetPickingListByIdInput } from './dto';
import { GetPickingListByIdService } from './get-picking-list-by-id.service';

@ApiTags('picking-lists')
@Controller('picking-lists')
export class GetPickingListByIdController {
  constructor(
    private readonly _getPickingListByIdService: GetPickingListByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.PICK_PACK,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.PRODUCT_ITEMS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Get(':pickingListId')
  @ApiResponse({
    status: 201,
    type: PickingListItemOutput,
  })
  async getPickingListById(
    @Param('pickingListId') pickingListId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<PickingListItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetPickingListByIdInput = {
      pickingListId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getPickingListByIdService.getPickingListById(
      input,
      user,
    );
  }
}
