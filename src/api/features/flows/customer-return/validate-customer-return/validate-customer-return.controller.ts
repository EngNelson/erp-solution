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
  NotFoundException,
  Patch,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { ValidateCustomerReturnInput } from './dto';
import { ValidateCustomerReturnService } from './validate-customer-return.service';

@ApiTags('customer-returns')
@Controller('customer-returns')
export class ValidateCustomerReturnController {
  constructor(
    private readonly _validateCustomerReturnService: ValidateCustomerReturnService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.SAV_MANAGER,
    AgentRoles.SAV_AGENT,
  )
  @Ressource(ApiRessources.CUSTOMER_RETURN)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch('validate/:customerReturnId')
  @ApiResponse({
    status: 201,
    type: CustomerReturnItemOutput,
  })
  async validateCustomerReturn(
    @Param('customerReturnId') customerReturnId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: ValidateCustomerReturnInput = {
      customerReturnId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._validateCustomerReturnService.validateCustomerReturn(
      input,
      user,
    );
  }
}
