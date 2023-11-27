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
import { CancelDeliveryPointInput } from './dto/cancel-delivery-point-input.dto';
import { CancelDeliveryPointService } from './cancel-delivery-point.service';


@ApiTags('delivery-points')
@Controller('delivery-points')
export class CancelDeliveryPointController {
  constructor(private readonly _cancelDeliveryPointService: CancelDeliveryPointService) { }


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Delete(":id")
  @ApiResponse({
    status: 200,
    type: CancelDeliveryPointInput,
  })
  async cancelDeliveryPoint(
    @Param() deliveryPointId: any,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CancelDeliveryPointInput | any> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: CancelDeliveryPointInput = {
      deliveryPointId:deliveryPointId.id,
      lang: params.lang
        ? params.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR,
    };
    return await this._cancelDeliveryPointService.cancelDeliveryPoint(input, user);
  }

}

