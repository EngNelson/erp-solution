import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CancelCustomerReturnService } from './cancel-customer-return.service';
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
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { CancelCustomerReturnInput } from './dto';

@ApiTags('customer-returns')
@Controller('customer-returns')
export class CancelCustomerReturnController {
  constructor(
    private readonly _cancelCustomerReturnService: CancelCustomerReturnService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.SAV_MANAGER,
    AgentRoles.SAV_AGENT,
  )
  @Ressource(ApiRessources.CUSTOMER_RETURN)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch('cancel/:customerReturnId')
  @ApiResponse({
    status: 201,
    type: CustomerReturnItemOutput,
  })
  async cancelCustomerReturn(
    @Param('customerReturnId') customerReturnId: string,
    @Body() body: CancelCustomerReturnInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.customerReturnId = customerReturnId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._cancelCustomerReturnService.cancelCustomerReturn(
      body,
      user,
    );
  }
}
