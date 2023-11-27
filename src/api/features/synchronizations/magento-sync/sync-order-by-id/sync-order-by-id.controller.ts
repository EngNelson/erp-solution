import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncOrderByIdService } from './sync-order-by-id.service';
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
import { OrderItemOutput } from 'src/domain/dto/orders';
import { SyncOrderByIdInput } from './dto';

@ApiTags('synchronization')
@Controller('synchronization')
export class SyncOrderByIdController {
  constructor(private readonly _syncOrderByIdService: SyncOrderByIdService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PICK_PACK,
    AgentRoles.SUPER_ADMIN,
    AgentRoles.PUS_AGENT,
    AgentRoles.PUS_MANAGER,
    AgentRoles.PUS_COORDINATOR,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Get(':magentoOrderId')
  @ApiResponse({
    status: 200,
    type: OrderItemOutput,
  })
  async syncOrderById(
    @Param('magentoOrderId') magentoOrderId: number,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: SyncOrderByIdInput = {
      magentoOrderId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._syncOrderByIdService.syncOrderById(input, user);
  }
}
