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
import { PurchaseOrderItemOutput } from 'src/domain/dto/purchases';
import { GetPurchaseOrderByIdInput } from './dto';
import { GetPurchaseOrderByIdService } from './get-purchase-order-by-id.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class GetPurchaseOrderByIdController {
  constructor(
    private readonly _getPurchaseOrderByIdService: GetPurchaseOrderByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':purchaseOrderId')
  @ApiResponse({
    status: 200,
    type: PurchaseOrderItemOutput,
  })
  async getPurchaseOrderById(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: GetPurchaseOrderByIdInput = {
      purchaseOrderId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getPurchaseOrderByIdService.getPurchaseOrderById(
      input,
      user,
    );
  }
}
