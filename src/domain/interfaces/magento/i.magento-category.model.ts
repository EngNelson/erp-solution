import { ChildDataModel, CustomAttributeModel } from '.';

export interface MagentoCategoryModel {
  id: number;
  parent_id: number;
  name: string;
  is_active: boolean;
  level: number;
  created_at: Date;
  updated_at: Date;
  path: string;
  pathArray: string[];
  children: number[];
  include_in_menu: boolean;
  custom_attributes: CustomAttributeModel[];
  children_data?: ChildDataModel[];
}
