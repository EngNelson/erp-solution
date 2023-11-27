import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from 'src/domain/entities/items/eav';
import { AddUnitController } from './add-unit/add-unit.controller';
import { AddUnitService } from './add-unit/add-unit.service';
import { EditUnitController } from './edit-unit/edit-unit.controller';
import { EditUnitService } from './edit-unit/edit-unit.service';
import { DeleteUnitsController } from './delete-units/delete-units.controller';
import { DeleteUnitsService } from './delete-units/delete-units.service';
import { RestoreUnitsController } from './restore-units/restore-units.controller';
import { RestoreUnitsService } from './restore-units/restore-units.service';
import { GetUnitsController } from './get-units/get-units.controller';
import { GetUnitsService } from './get-units/get-units.service';
import { GetUnitByIdController } from './get-unit-by-id/get-unit-by-id.controller';
import { GetUnitByIdService } from './get-unit-by-id/get-unit-by-id.service';
import { GetDeletedUnitsController } from './get-deleted-units/get-deleted-units.controller';
import { GetDeletedUnitsService } from './get-deleted-units/get-deleted-units.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unit])],
  controllers: [
    AddUnitController,
    EditUnitController,
    DeleteUnitsController,
    RestoreUnitsController,
    GetUnitsController,
    GetUnitByIdController,
    GetDeletedUnitsController,
  ],
  providers: [
    AddUnitService,
    EditUnitService,
    DeleteUnitsService,
    RestoreUnitsService,
    GetUnitsService,
    GetUnitByIdService,
    GetDeletedUnitsService,
  ],
})
export class UnitModule {}
