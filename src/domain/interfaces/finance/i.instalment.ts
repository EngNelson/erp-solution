import { InstalmentType } from 'src/domain/enums/finance';
import { InstalmentModel } from './i.instalement-model';

export interface Instalment {
  taux: number;
  type: InstalmentType;
  balance: number;
  instalments: InstalmentModel[];
}
