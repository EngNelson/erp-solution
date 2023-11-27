import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  Unit,
} from 'src/domain/entities/items/eav';
import { AddAttributeSetController } from './add-attribute-set/add-attribute-set.controller';
import { AddAttributeSetService } from './add-attribute-set/add-attribute-set.service';
import { GetAttributeSetByIdController } from './get-attribute-set-by-id/get-attribute-set-by-id.controller';
import { GetAttributeSetByIdService } from './get-attribute-set-by-id/get-attribute-set-by-id.service';
import { EditAttributeSetController } from './edit-attribute-set/edit-attribute-set.controller';
import { EditAttributeSetService } from './edit-attribute-set/edit-attribute-set.service';
import { GetAttributeSetsController } from './get-attribute-sets/get-attribute-sets.controller';
import { GetAttributeSetsService } from './get-attribute-sets/get-attribute-sets.service';
import { DeleteAttributeSetController } from './delete-attribute-set/delete-attribute-set.controller';
import { DeleteAttributeSetService } from './delete-attribute-set/delete-attribute-set.service';
import { Product, ProductVariant } from 'src/domain/entities/items';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttributeSet,
      Attribute,
      AttributeOption,
      Unit,
      Product,
      ProductVariant,
    ]),
  ],
  controllers: [
    AddAttributeSetController,
    GetAttributeSetByIdController,
    EditAttributeSetController,
    GetAttributeSetsController,
    DeleteAttributeSetController,
  ],
  providers: [
    AddAttributeSetService,
    GetAttributeSetByIdService,
    EditAttributeSetService,
    GetAttributeSetsService,
    DeleteAttributeSetService,
  ],
})
export class AttributeSetModule {}
