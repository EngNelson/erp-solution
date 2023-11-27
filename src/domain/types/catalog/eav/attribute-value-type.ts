import { TString } from '@glosuite/shared';

export type AttributeValueType = {
  id?: string;
  code?: string;
  value: TString | string | number;
  unitId?: string;
};
