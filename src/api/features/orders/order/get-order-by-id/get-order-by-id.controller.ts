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
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetOrderByIdItemOutput, OrderItemOutput } from 'src/domain/dto/orders';
import { GetOrderByIdInput } from './dto';
import { GetOrderByIdService } from './get-order-by-id.service';

@ApiTags('orders')
@Controller('orders')
export class GetOrderByIdController {
  constructor(private readonly _getOrderByIdService: GetOrderByIdService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':orderId')
  @ApiResponse({
    status: 200,
    type: GetOrderByIdItemOutput,
  })
  async getOrderById(
    @Param('orderId') orderId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<GetOrderByIdItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetOrderByIdInput = {
      orderId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getOrderByIdService.getOrderById(input, user);
  }
}
