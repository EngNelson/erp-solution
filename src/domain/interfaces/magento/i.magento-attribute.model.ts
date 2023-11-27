import { MagentoAttributeOptionModel, MagentoFrontendLabelModel } from '.';

export interface MagentoAttributeModel {
  id: number;
  attribute_code: string;
  frontend_input: string;
  options: MagentoAttributeOptionModel[];
  is_user_defined: boolean;
  default_frontend_label: string;
  backend_type: string;
  frontend_labels: MagentoFrontendLabelModel[];
}
