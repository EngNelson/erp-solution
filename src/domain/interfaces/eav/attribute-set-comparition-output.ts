import { AttributeSet } from 'src/domain/entities/items/eav';

export interface AttributeSetComparitionOutput {
  status: boolean;
  attributeSet?: AttributeSet;
}
