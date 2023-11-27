import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from 'src/domain/entities/logistics';
import { Order } from 'src/domain/entities/orders';
import { AddDeliveryController } from './add-delivery/add-delivery.controller';
import { AddDeliveryService } from './add-delivery/add-delivery.service';
import { SendingEmailService } from 'src/services/email';
import { HttpModule } from '@nestjs/axios';
import { GetDeliveryByIdController } from './get-delivery-by-id/get-delivery-by-id.controller';
import { GetDeliveriesController } from './get-deliveries/get-deliveries.controller';
import { GetDeliveriesService } from './get-deliveries/get-deliveries.service';
import { GetDeliveryByIdService } from './get-delivery-by-id/get-delivery-by-id.service';
import { EditDeliveriesService } from './edit-delivery/edit-delivery.service';
import { EditDeliveriesController } from './edit-delivery/edit-delivery.controller';
import { CancelDeliveryController } from './cancel-delivery/cancel-delivery.controller';
import { CancelDeliveryService } from './cancel-delivery/cancel-delivery.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Delivery]), HttpModule],
  controllers: [
    AddDeliveryController, 
    GetDeliveryByIdController, 
    GetDeliveriesController, 
    EditDeliveriesController, 
    CancelDeliveryController
  ],
  providers: [
    AddDeliveryService, 
    SendingEmailService, 
    GetDeliveriesService, 
    GetDeliveryByIdService, 
    EditDeliveriesService,
    CancelDeliveryService
  ]
})
export class DeliveryModule { }