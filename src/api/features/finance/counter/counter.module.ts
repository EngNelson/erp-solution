import { Module } from '@nestjs/common';
import { GetCountersController } from './get-counters/get-counters.controller';
import { GetCountersService } from './get-counters/get-counters.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Counter } from 'src/domain/entities/finance';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { GetCounterByIdController } from './get-counter-by-id/get-counter-by-id.controller';
import { GetCounterByIdService } from './get-counter-by-id/get-counter-by-id.service';

@Module({
  imports: [TypeOrmModule.forFeature([Counter, StoragePoint])],
  controllers: [GetCountersController, GetCounterByIdController],
  providers: [GetCountersService, GetCounterByIdService],
})
export class CounterModule {}
