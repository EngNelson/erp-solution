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
import { GetDeliveryByIdInput } from './dto';
import { GetDeliveryByIdService } from './get-delivery-by-id.service';
import { GetDeliveryByIdDto } from 'src/domain/dto/delivery/get-delivery-by-id-output.dto';


@ApiTags('delivery')
@Controller('delivery')
export class GetDeliveryByIdController {
  constructor(private readonly _getDeliveryByIdService: GetDeliveryByIdService) { }


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':id')
  @ApiResponse({
    status: 200,

    type: GetDeliveryByIdInput,
  })
  async getDeliveryById(
    @Param("id") deliveryId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<GetDeliveryByIdDto | any> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: GetDeliveryByIdInput = {
      deliveryId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR,
    };
    return await this._getDeliveryByIdService.getDeliveryById(input, user);
  }

}

