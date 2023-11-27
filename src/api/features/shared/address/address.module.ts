import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from 'src/domain/entities/shared';
import { GetAddressByIdController } from './get-address-by-id/get-address-by-id.controller';
import { GetAddressByIdService } from './get-address-by-id/get-address-by-id.service';
import { GetAddressesController } from './get-addresses/get-addresses.controller';
import { GetAddressesService } from './get-addresses/get-addresses.service';
import { AddAddressController } from './add-address/add-address.controller';
import { AddAddressService } from './add-address/add-address.service';
import { EditAddressController } from './edit-address/edit-address.controller';
import { EditAddressService } from './edit-address/edit-address.service';

@Module({
  imports: [TypeOrmModule.forFeature([Address])],
  controllers: [
    GetAddressByIdController,
    GetAddressesController,
    AddAddressController,
    EditAddressController,
  ],
  providers: [
    GetAddressByIdService,
    GetAddressesService,
    AddAddressService,
    EditAddressService,
  ],
})
export class AddressModule {}
