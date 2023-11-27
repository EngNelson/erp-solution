import {
  Abilities,
  AgentRoles,
  ApiRessources,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { SupplierItemOutput } from 'src/domain/dto/purchases';
import { AddSupplierService } from './add-supplier.service';
import { AddSupplierInput } from './dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class AddSupplierController {
  constructor(private readonly _addSupplierService: AddSupplierService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.CATMAN_SUPERVISOR,
    AgentRoles.CATMAN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.PROCUREMENT_ASSISTANT,
  )
  @Ressource(ApiRessources.SUPPLIER)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: SupplierItemOutput,
  })
  async addSupplier(
    @Body() body: AddSupplierInput,
    @UserConnected() user: UserCon,
  ): Promise<SupplierItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this._addSupplierService.addSupplier(body, user);
  }
}
