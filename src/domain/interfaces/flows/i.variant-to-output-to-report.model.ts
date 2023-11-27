import { ProductVariant } from 'src/domain/entities/items';

export interface VariantToOutputToReportModel {
  variant: ProductVariant;
  quantity: number;
}
