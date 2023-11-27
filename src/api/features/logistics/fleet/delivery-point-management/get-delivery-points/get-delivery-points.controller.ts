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
import { GetDeliveryPointsInput, GetDeliveryPointsOutput } from './dto';
import { GetDeliveryPointsService } from './get-delivery-points.service';
import { GetOrdersOptionsDto } from 'src/domain/dto/orders/get-orders-options.dto';



@ApiTags('delivery-points')
@Controller('delivery-points')
export class GetDeliveryPointsController{
  constructor(private readonly _getDeliveryPointsService: GetDeliveryPointsService){}


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetDeliveryPointsOutput,
  })
  async getDeliveryPoints(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetOrdersOptionsDto,
  ): Promise<GetDeliveryPointsOutput | any >{
    
    if(!user){
      throw new NotFoundException(`User not found`);
    }

    const input: GetDeliveryPointsInput = {pagination, ...options};
   return await this._getDeliveryPointsService.getDeliveryPoints(input, user);
   
}

}

