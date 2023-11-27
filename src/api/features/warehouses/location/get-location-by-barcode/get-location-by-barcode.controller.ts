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
import { MiniLocationOutput } from 'src/domain/dto/warehouses';
import { GetLocationByBarcodeInput } from './dto';
import { GetLocationByBarcodeService } from './get-location-by-barcode.service';

@ApiTags('locations')
@Controller('locations')
export class GetLocationByBarcodeController {
  constructor(
    private readonly _getLocationByBarcodeService: GetLocationByBarcodeService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.PUS_AGENT,
    AgentRoles.PUS_MANAGER,
    AgentRoles.PUS_CASHIER,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.DELIVER_AGENT,
    AgentRoles.SAV_MANAGER,
    AgentRoles.SAV_AGENT,
  )
  @Ressource(ApiRessources.LOCATIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/barcode/:barcode')
  @ApiResponse({
    status: 200,
    type: MiniLocationOutput,
  })
  async getLocationByBarcode(
    @Param('barcode') barcode: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<MiniLocationOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetLocationByBarcodeInput = {
      barcode,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getLocationByBarcodeService.getLocationByBarcode(
      input,
      user,
    );
  }
}
