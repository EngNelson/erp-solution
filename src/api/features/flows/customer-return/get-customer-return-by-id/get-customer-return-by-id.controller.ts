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
import { GetCustomerReturnByIdService } from './get-customer-return-by-id.service';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { GetCustomerReturnIdInput } from './dto/get-custumer-return-by-id-input.dto';

@ApiTags('customer-returns')
@Controller('customer-returns')
export class GetCustomerReturnByIdController {
  constructor(
    private readonly _getCustomerReturnServiceById: GetCustomerReturnByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.SAV_AGENT,
    AgentRoles.SAV_MANAGER,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.CUSTOMER_RETURN)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Get(':customerReturnId')
  @ApiResponse({
    status: 201,
    type: CustomerReturnItemOutput,
  })
  async addCustomerReturn(
    @Param('customerReturnId') customerReturnId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: GetCustomerReturnIdInput = {
      customerReturnId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getCustomerReturnServiceById.getCustomerReturnById(
      input,
      user,
    );
  }
}
