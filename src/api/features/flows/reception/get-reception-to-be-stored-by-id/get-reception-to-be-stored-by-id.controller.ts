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
import {
  GetReceptionToBeStoredByIdInput,
  GetReceptionToBeStoredByIdOutput,
} from './dto';
import { GetReceptionToBeStoredByIdService } from './get-reception-to-be-stored-by-id.service';

@ApiTags('receptions')
@Controller('receptions')
export class GetReceptionToBeStoredByIdController {
  constructor(
    private readonly _getReceptionToBeStoredByIdServie: GetReceptionToBeStoredByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/to-be-stored/:receptionId')
  @ApiResponse({
    status: 200,
    type: GetReceptionToBeStoredByIdOutput,
  })
  async getReceptionToBeStoredById(
    @Param('receptionId') receptionId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<GetReceptionToBeStoredByIdOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetReceptionToBeStoredByIdInput = {
      receptionId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getReceptionToBeStoredByIdServie.getReceptionToBeStoredById(
      input,
      user,
    );
  }
}
