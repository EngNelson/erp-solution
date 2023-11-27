import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute, AttributeValue, Unit } from 'src/domain/entities/items/eav';
import { AddAttributeController } from './add-attribute/add-attribute.controller';
import { AddAttributeService } from './add-attribute/add-attribute.service';
import { EditAttributeController } from './edit-attribute/edit-attribute.controller';
import { EditAttributeService } from './edit-attribute/edit-attribute.service';
import { GetAttributesController } from './get-attributes/get-attributes.controller';
import { GetAttributesService } from './get-attributes/get-attributes.service';
import { DeleteAttributeController } from './delete-attribute/delete-attribute.controller';
import { DeleteAttributeService } from './delete-attribute/delete-attribute.service';
import { RestoreAttributeController } from './restore-attribute/restore-attribute.controller';
import { RestoreAttributeService } from './restore-attribute/restore-attribute.service';
import { GetDeletedAttributesController } from './get-deleted-attributes/get-deleted-attributes.controller';
import { GetDeletedAttributesService } from './get-deleted-attributes/get-deleted-attributes.service';
import { GetAttributeByIdController } from './get-attribute-by-id/get-attribute-by-id.controller';
import { GetAttributeByIdService } from './get-attribute-by-id/get-attribute-by-id.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attribute, AttributeValue, Unit])],
  controllers: [
    AddAttributeController,
    EditAttributeController,
    GetAttributesController,
    DeleteAttributeController,
    RestoreAttributeController,
    GetDeletedAttributesController,
    GetAttributeByIdController,
  ],
  providers: [
    AddAttributeService,
    EditAttributeService,
    GetAttributesService,
    DeleteAttributeService,
    RestoreAttributeService,
    GetDeletedAttributesService,
    GetAttributeByIdService,
  ],
})
export class AttributeModule {}
