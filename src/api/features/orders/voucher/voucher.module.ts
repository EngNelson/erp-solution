import { Module } from '@nestjs/common';
import { GetVoucherByCodeController } from './get-voucher-by-code/get-voucher-by-code.controller';
import { GetVoucherByCodeService } from './get-voucher-by-code/get-voucher-by-code.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from 'src/domain/entities/orders';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Voucher])],
  controllers: [GetVoucherByCodeController],
  providers: [GetVoucherByCodeService],
})
export class VoucherModule {}
