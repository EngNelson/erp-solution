import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { AddCustomerReturnService } from './add-customer-return.service';
import { AddCustomerReturnInput } from './dto';

@ApiTags('customer-returns')
@Controller('customer-returns')
export class AddCustomerReturnController {
  constructor(
    private readonly _addCustomerReturnService: AddCustomerReturnService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.SAV_AGENT,
    AgentRoles.SAV_MANAGER,
  )
  @Ressource(ApiRessources.CUSTOMER_RETURN)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: CustomerReturnItemOutput,
  })
  async addCustomerReturn(
    @Body() body: AddCustomerReturnInput,
    @Query() parans: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = parans.lang
      ? parans.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addCustomerReturnService.addCustomerReturn(body, user);
  }
}
