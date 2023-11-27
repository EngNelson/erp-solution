import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Param,
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
import { GetDeliveryPointByIdInput } from './dto';
import { GetDeliveryPointByIdService } from './get-delivery-point-by-id.service';



@ApiTags('delivery-points')
@Controller('delivery-points')
export class GetDeliveryPointByIdController {
  constructor(private readonly _getDeliveryPointByIdService: GetDeliveryPointByIdService) { }


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':id')
  @ApiResponse({
    status: 200,
    type: GetDeliveryPointByIdInput,
  })
  async getDeliveryById(
    @Param("id") deliveryPointId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<GetDeliveryPointByIdInput | any> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: GetDeliveryPointByIdInput = {
      deliveryPointId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR,
    };
    return await this._getDeliveryPointByIdService.getDeliveryPointById(input, user);
  }

}

