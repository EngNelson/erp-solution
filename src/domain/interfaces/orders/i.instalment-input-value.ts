import { InstalmentType } from 'src/domain/enums/finance';
import { InstalmentModelValue } from './i.instalment-model-value';

export interface InsalmentInputValue {
  type: InstalmentType;
  taux: number;
  instalments: InstalmentModelValue[];
}
