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
import { EditDeliveryPointService } from './edit-delivery-point.service';
import { EditDeliveryPointInput } from './dto/edit-delivery-point-input.dto';



@ApiTags('delivery-points')
@Controller('delivery-points')
export class EditDeliveryPointController {
  constructor(private readonly _editDeliveryPointService: EditDeliveryPointService) {}


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Put(":id")
  @ApiResponse({
    status: 200,
    type: EditDeliveryPointInput,
  })
  async editDeliveryPoint(
    @UserConnected() user: UserCon,
    @Body() payload: Partial<EditDeliveryPointInput>,
    @Param() id: string
  ): Promise<EditDeliveryPointInput | any> {

    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: EditDeliveryPointInput = { ...payload, deliveryPointId: id };
    return await this._editDeliveryPointService.editDeliveryPoint(input, user);
  }

}

