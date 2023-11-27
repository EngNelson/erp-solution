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
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { GetCustomerReturnsOutput } from './dto/get-customer-returns-output.dto';
import { GetCustomerReturnsInput } from './dto/get-customer-returns-input.dto';
import { GetCustomerReturnsOptionsDto } from 'src/domain/dto/flows/get-custumer-return-options.dto';
import { GetCustomerReturnsService } from './get-customer-returns.service';

@ApiTags('customer-returns')
@Controller('customer-returns')
export class GetCustomerReturnsController {
  constructor(
    private readonly _getCustomerReturnsService: GetCustomerReturnsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Public()
  @Get()
  @Get()
  @ApiResponse({
    status: 201,
    type: GetCustomerReturnsOutput,
  })
  async addCustomerReturn(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetCustomerReturnsOptionsDto,
  ): Promise<GetCustomerReturnsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCustomerReturnsInput = { pagination, options };
    return await this._getCustomerReturnsService.getCustomerReturn(input, user);
  }
}
