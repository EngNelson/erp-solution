import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncOrderByReferenceService } from './sync-order-by-reference.service';
import { OrderItemOutput } from 'src/domain/dto/orders';
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
import { SyncOrderByReferenceInput } from './dto';

@ApiTags('synchronization')
@Controller('synchronization')
export class SyncOrderByReferenceController {
  constructor(
    private readonly _syncOrderByReferenceService: SyncOrderByReferenceService,
  ) {}

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
  @Get('reference/:orderRef')
  @ApiResponse({
    status: 200,
    type: OrderItemOutput,
  })
  async syncOrderByReference(
    @Param('orderRef') orderRef: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: SyncOrderByReferenceInput = {
      orderRef,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._syncOrderByReferenceService.syncOrderByReference(
      input,
      user,
    );
  }
}
