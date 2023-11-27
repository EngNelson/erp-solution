import {
  Controller,
  NotFoundException,
  Query,
  Param,
  UseGuards,
  Delete,
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
import { CancelDeliveryService } from './cancel-delivery.service';
import { CancelDeliveryInput } from './dto/cancel-delivery-input.dto';


@ApiTags('delivery')
@Controller('delivery')
export class CancelDeliveryController {
  constructor(private readonly _cancelDeliveryService: CancelDeliveryService) {}


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Delete(":id")
  @ApiResponse({
    status: 200,
    type: CancelDeliveryInput,
  })
  async cancelDelivery(
    @Param(":id") deliveryId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CancelDeliveryInput | any> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: CancelDeliveryInput = {
      deliveryId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR,
    };
    return await this._cancelDeliveryService.cancelDelivery(input, user);
  }

}

