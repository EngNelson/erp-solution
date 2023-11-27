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
import { GetDeliveriesInput, GetDeliveriesOutput } from './dto';
import { GetDeliveriesService } from './get-deliveries.service';
import { GetOrdersOptionsDto } from 'src/domain/dto/orders/get-orders-options.dto';



@ApiTags('delivery')
@Controller('delivery')
export class GetDeliveriesController{
  constructor(private readonly _getDeliveriesService: GetDeliveriesService){}


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetDeliveriesOutput,
  })
  async getDeliveries(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetOrdersOptionsDto,
  ): Promise<GetDeliveriesOutput | any >{
    
    if(!user){
      throw new NotFoundException(`User not found`);
    }

    const input: GetDeliveriesInput = {pagination, ...options};
   return await this._getDeliveriesService.getDeliveries(input, user);
   
}

}

