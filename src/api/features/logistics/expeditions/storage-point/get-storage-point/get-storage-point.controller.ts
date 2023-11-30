import {
    Body,
    Controller,
    NotFoundException,
    Query,
    Req,
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
  import { GetStoragePointsInput } from './dto';
import { GetStoragePointsService } from './get-storage-point.service';
  
  @ApiTags('storage-points')
  @Controller('storage-points')
  export class GetStoragePointsController {
    constructor(private readonly _getStoragePointService: GetStoragePointsService) { }
  
    @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(
      AgentRoles.SUPER_ADMIN,
      AgentRoles.ADMIN,
      AgentRoles.PUS_COORDINATOR,
      AgentRoles.PUS_MANAGER,
      AgentRoles.PUS_AGENT,
      AgentRoles.PUS_CASHIER,
      AgentRoles.SAV_AGENT,
      AgentRoles.SAV_MANAGER,
      AgentRoles.STOCK_AGENT,
      AgentRoles.PICK_PACK,
      AgentRoles.FLEET_SUPERVISOR,
      AgentRoles.WAREHOUSE_MANAGER,
      AgentRoles.LOGISTIC_MANAGER,
      AgentRoles.CUSTOMER_SERVICE,
      AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    )
    @Ressource(ApiRessources.STORAGE_POINT)
    @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
    @Get()
    @ApiResponse({
      status: 201,
      type: GetStoragePointsInput,
    })
    async getStoragePoints(
      @Body() body: GetStoragePointsInput,
      @Query() params: ISOLandDto,
      @UserConnected() user: UserCon,
      @Req() request: any,
    ): Promise<any> {
      if (!user) {
        throw new NotFoundException(`User not Found`);
      }
  
      body.lang = params.lang
        ? params.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR;
  
      const accessToken = request.headers.authorization.replace('Bearer', '');
      return await this._getStoragePointService.getStoragePoints(body, user, accessToken);
    }
  
  }
  
  
  