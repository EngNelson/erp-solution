import { AlertType } from 'src/domain/enums/finance';

export interface CashedAlert {
  type: AlertType;
  amount: number;
  details?: string;
}
