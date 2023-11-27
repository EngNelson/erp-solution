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
import {
  Controller,
  UseGuards,
  Patch,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { Body } from '@nestjs/common/decorators';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { ResolveCustomerReturnInput } from './dto';
import { ResolveCustomerReturnService } from './resolve-customer-return.service';

@ApiTags('customer-returns')
@Controller('customer-returns')
export class ResolveCustomerReturnController {
  constructor(
    private readonly _resolveCustomerReturnService: ResolveCustomerReturnService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.SAV_MANAGER,
    AgentRoles.SAV_AGENT,
  )
  @Ressource(ApiRessources.CUSTOMER_RETURN)
  @RequirePrivileges(Abilities.MANAGE, Abilities.RESOLVE)
  @Patch('resolve/:customerReturnId')
  @ApiResponse({
    status: 201,
    type: CustomerReturnItemOutput,
  })
  async resoleCustomerReturn(
    @Body() body: ResolveCustomerReturnInput,
    @Param('customerReturnId') customerReturnId: string,
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

    return await this._resolveCustomerReturnService.resolveCustomerReturn(
      body,
      user,
    );
  }
}
