import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { EditDeliveriesService } from './edit-delivery.service';
import { EditDeliveriesInput } from './dto';



@ApiTags('delivery')
@Controller('delivery')
export class EditDeliveriesController {
  constructor(private readonly _getDeliveriesService: EditDeliveriesService) { }


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Put(":id")
  @ApiResponse({
    status: 200,
    type: EditDeliveriesInput,
  })
  async editDelivery(
    @UserConnected() user: UserCon,
    @Body() payload: Partial<EditDeliveriesInput>,
    @Param() id: string
  ): Promise<EditDeliveriesInput | any> {

    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: EditDeliveriesInput = { ...payload, deliveryId: id };
    return await this._getDeliveriesService.editDelivery(input, user);
  }

}

