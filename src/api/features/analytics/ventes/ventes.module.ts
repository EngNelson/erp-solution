import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/domain/entities/orders';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { GetSalesReportController } from './get-sales-report/get-sales-report.controller';
import { GetSalesReportService } from './get-sales-report/get-sales-report.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Order, StoragePoint])],
  controllers: [GetSalesReportController],
  providers: [GetSalesReportService],
})
export class VentesModule {}
