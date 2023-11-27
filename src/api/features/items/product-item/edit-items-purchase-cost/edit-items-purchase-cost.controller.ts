import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EditItemsPurchaseCostService } from './edit-items-purchase-cost.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
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
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { EditItemsPurchaseCostInput } from './dto';

@ApiTags('product-items')
@Controller('product-items')
export class EditItemsPurchaseCostController {
  constructor(
    private readonly _editItemsPurchaseCostService: EditItemsPurchaseCostService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.PRODUCT_ITEMS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch()
  @ApiResponse({
    status: 201,
    type: ReceptionItemOutput,
  })
  async editItemsPurchaseCost(
    @Body() body: EditItemsPurchaseCostInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ReceptionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._editItemsPurchaseCostService.editItemsPurchaseCost(
      body,
      user,
    );
  }
}
