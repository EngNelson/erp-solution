import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPoint } from 'src/domain/entities/logistics/delivery-point.entity';
import { AddDeliveryPointController } from './add-delivery-point/add-delivery-point.controller';
import { CancelDeliveryPointController } from './cancel-delivery-point/cancel-delivery-point.controller';
import { EditDeliveryPointController } from './edit-delivery-point/edit-delivery-point.controller';
import { GetDeliveryPointByIdController } from './get-delivery-point-by-id/get-delivery-point-by-id.controller';
import { GetDeliveryPointsController } from './get-delivery-points/get-delivery-points.controller';
import { AddDeliveryPointService } from './add-delivery-point/add-delivery-point.service';
import { CancelDeliveryPointService } from './cancel-delivery-point/cancel-delivery-point.service';
import { EditDeliveryPointService } from './edit-delivery-point/edit-delivery-point.service';
import { GetDeliveryPointsService } from './get-delivery-points/get-delivery-points.service';
import { GetDeliveryPointByIdService } from './get-delivery-point-by-id/get-delivery-point-by-id.service';


@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPoint])],
  controllers: [AddDeliveryPointController,CancelDeliveryPointController,EditDeliveryPointController,GetDeliveryPointsController,GetDeliveryPointByIdController],
  providers: [AddDeliveryPointService,CancelDeliveryPointService,EditDeliveryPointService,GetDeliveryPointsService,GetDeliveryPointByIdService]
})
export class DeliveryPointModule { }