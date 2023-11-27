import { TString } from '@glosuite/shared';
import { VariantAttributeValue } from '../catalog/items';

export type CustomProductData = {
  title: TString;
  sku?: string;
  attributeValues: VariantAttributeValue<any>[];
  quantity: number;
  purchaseCost: number;
  supplierId?: string;
};
