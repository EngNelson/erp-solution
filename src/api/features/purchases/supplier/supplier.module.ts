import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from 'src/domain/entities/purchases';
import { GetSuppliersController } from './get-suppliers/get-suppliers.controller';
import { GetSuppliersService } from './get-suppliers/get-suppliers.service';
import { SearchSuppliersByNameController } from './search-suppliers-by-name/search-suppliers-by-name.controller';
import { SearchSuppliersByNameService } from './search-suppliers-by-name/search-suppliers-by-name.service';
import { GetSupplierByIdController } from './get-supplier-by-id/get-supplier-by-id.controller';
import { GetSupplierByIdService } from './get-supplier-by-id/get-supplier-by-id.service';
import { AddSupplierController } from './add-supplier/add-supplier.controller';
import { AddSupplierService } from './add-supplier/add-supplier.service';
import { Address } from 'src/domain/entities/shared';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, Address])],
  controllers: [
    GetSuppliersController,
    SearchSuppliersByNameController,
    GetSupplierByIdController,
    AddSupplierController,
  ],
  providers: [
    GetSuppliersService,
    SearchSuppliersByNameService,
    GetSupplierByIdService,
    AddSupplierService,
  ],
})
export class SupplierModule {}
