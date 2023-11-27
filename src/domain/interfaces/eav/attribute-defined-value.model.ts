import { TString } from '@glosuite/shared';
import { Unit } from 'src/domain/entities/items/eav';

export interface AttributeDefinedValueModel {
  id?: string;
  code?: string;
  value: TString | string | number;
  unit?: Unit;
}
