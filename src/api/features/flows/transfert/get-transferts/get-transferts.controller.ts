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
import { GetTransfertsOptionsDto } from 'src/domain/dto/flows';
import { GetTransfertsInput, GetTransfertsOutput } from './dto';
import { GetTransfertsService } from './get-transferts.service';

@ApiTags('transferts')
@Controller('transferts')
export class GetTransfertsController {
  constructor(private readonly _getTransfertsService: GetTransfertsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetTransfertsOutput,
  })
  async getTransferts(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetTransfertsOptionsDto,
  ): Promise<GetTransfertsOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetTransfertsInput = { pagination, options };
    return await this._getTransfertsService.getTransferts(input, user);
  }
}
