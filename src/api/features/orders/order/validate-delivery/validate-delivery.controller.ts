import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ValidateDeliveryService } from './validate-delivery.service';
import { ValidateDeliveryInput, ValidateDeliveryOutput } from './dto';
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

@ApiTags('orders')
@Controller('orders')
export class ValidateDeliveryController {
  constructor(
    private readonly _validateDeliveryService: ValidateDeliveryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PUS_CASHIER,
    AgentRoles.TREASURY,
    AgentRoles.ACCOUNTING,
    AgentRoles.SUPER_ADMIN,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('validate-delivery')
  @ApiResponse({
    status: 201,
    type: ValidateDeliveryOutput,
  })
  async validateDelivery(
    @Body() body: ValidateDeliveryInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ValidateDeliveryOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._validateDeliveryService.validateDelivery(body, user);
  }
}
