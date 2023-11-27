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
import { ProductItemItemOutput } from 'src/domain/dto/items';
import { GetProductItemByBarcodeInput } from './dto';
import { GetProductItemByBarcodeService } from './get-product-item-by-barcode.service';

@ApiTags('product-items')
@Controller('product-items')
export class GetProductItemByBarcodeController {
  constructor(
    private readonly _getProductItemByBarcodeService: GetProductItemByBarcodeService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.PUS_MANAGER,
    AgentRoles.PUS_AGENT,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.EXPEDITION_SUPERVISOR,
  )
  @Ressource(ApiRessources.PRODUCT_ITEMS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':barcode')
  @ApiResponse({
    status: 200,
    type: ProductItemItemOutput,
  })
  async getProductItemByBarcode(
    @Param('barcode') barcode: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductItemItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetProductItemByBarcodeInput = {
      barcode,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getProductItemByBarcodeService.getProductItemByBarcode(
      input,
      user,
    );
  }
}
