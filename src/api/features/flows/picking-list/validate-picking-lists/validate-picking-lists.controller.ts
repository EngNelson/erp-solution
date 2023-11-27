import {
  Body,
  Controller,
  NotFoundException,
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
import { ValidatePickingListInput, ValidatePickingListsOutput } from './dto';
import { ValidatePickingListService } from './validate-picking-lists.service';

@ApiTags('picking-lists')
@Controller('picking-lists')
export class ValidatePickingListController {
  constructor(
    private readonly _validatePickingListService: ValidatePickingListService,
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
  @Patch('/validate')
  @ApiResponse({
    status: 200,
    type: ValidatePickingListsOutput,
  })
  async validatePickingList(
    @Body() body: ValidatePickingListInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ValidatePickingListsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._validatePickingListService.validatePickingList(
      body,
      user,
    );
  }
}
