import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncVariantBySKUService } from './sync-variant-by-sku.service';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { SyncVariantBySKUInput } from './dto';
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
import { JwtAuthGuard, RolesGuard, PermissionsGuard } from 'src/api/guards';
import { OrderItemOutput } from 'src/domain/dto/orders';

@ApiTags('synchronization')
@Controller('synchronization')
export class SyncVariantBySKUController {
  constructor(
    private readonly _syncVariantBySKUService: SyncVariantBySKUService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PUS_AGENT,
    AgentRoles.PUS_MANAGER,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.PICK_PACK,
    AgentRoles.SUPER_ADMIN,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('articles/:magentoSku')
  @ApiResponse({
    status: 200,
    type: OrderItemOutput,
  })
  async syncVariantBySKU(
    @Param('magentoSku') magentoSku: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: SyncVariantBySKUInput = {
      magentoSku,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._syncVariantBySKUService.syncVariantBySKU(input, user);
  }
}
