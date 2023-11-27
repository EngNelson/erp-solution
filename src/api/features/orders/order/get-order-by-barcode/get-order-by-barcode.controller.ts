import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetOrderByBarcodeService } from './get-order-by-barcode.service';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { Public, UserCon, UserConnected } from '@glosuite/shared';
import {
  GetOrderByBarcodeInput,
  GetOrderByBarcodeOption,
  GetOrderByBarcodeOutput,
} from './dto';
import { OrderItemOutput } from 'src/domain/dto/orders';

@ApiTags('orders')
@Controller('orders')
export class GetOrderByBarcodeController {
  constructor(
    private readonly _getOrderByBarcodeService: GetOrderByBarcodeService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('by-barcode/:barcode')
  @ApiResponse({
    status: 200,
    type: GetOrderByBarcodeOutput,
  })
  async getOrderByBarcode(
    @Param('barcode') barcode: string,
    @Query() options: GetOrderByBarcodeOption,
    @UserConnected() user: UserCon,
  ): Promise<GetOrderByBarcodeOutput | OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetOrderByBarcodeInput = {
      barcode,
      options,
    };

    return await this._getOrderByBarcodeService.getOrderByBarcode(input, user);
  }
}
