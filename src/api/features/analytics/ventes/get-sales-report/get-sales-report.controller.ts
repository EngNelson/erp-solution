import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetSalesReportService } from './get-sales-report.service';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { Public, UserCon, UserConnected } from '@glosuite/shared';
import { GetSalesReportInput, GetSalesReportOutput } from './dto';

@ApiTags('analytics')
@Controller('sales')
export class GetSalesReportController {
  constructor(private readonly _getSalesReportService: GetSalesReportService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('reports')
  @ApiResponse({
    status: 201,
    type: GetSalesReportOutput,
  })
  async getSalesReport(
    @Query() params: GetSalesReportInput,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<GetSalesReportOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._getSalesReportService.getSalesReport(
      params,
      user,
      accessToken,
    );
  }
}
