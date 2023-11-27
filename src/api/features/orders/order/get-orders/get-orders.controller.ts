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
import { GetOrdersInput, GetOrdersOutput } from './dto';
import { GetOrdersService } from './get-orders.service';
import { GetOrdersOptionsDto } from 'src/domain/dto/orders';

@ApiTags('orders')
@Controller('orders')
export class GetOrdersController {
  constructor(private readonly _getOrdersService: GetOrdersService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetOrdersOutput,
  })
  async getOrders(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetOrdersOptionsDto,
  ): Promise<GetOrdersOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetOrdersInput = { pagination, options };
    return await this._getOrdersService.getOrders(input, user);
  }
}
