import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetPurchaseOrdersOptionsDto } from 'src/domain/dto/purchases';
import { GetPurchaseOrdersInput, GetPurchaseOrdersOutput } from './dto';
import { GetPurchaseOrdersService } from './get-purchase-orders.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class GetPurchaseOrdersController {
  constructor(
    private readonly _getPurchaseOrdersService: GetPurchaseOrdersService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('')
  @ApiResponse({
    status: 200,
    type: GetPurchaseOrdersOutput,
  })
  async getPurchaseOrders(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetPurchaseOrdersOptionsDto,
  ): Promise<GetPurchaseOrdersOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetPurchaseOrdersInput = { pagination, options };
    return await this._getPurchaseOrdersService.getPurchaseOrders(input, user);
  }
}
