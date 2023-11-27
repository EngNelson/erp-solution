import { ProductType } from 'src/domain/enums/items';

export type OptionsValues = {
  productType?: ProductType;
  canBeSold?: boolean;
  canBeRented?: boolean;
  canBePackaged?: boolean;
  mustBePackaged?: boolean;
};
