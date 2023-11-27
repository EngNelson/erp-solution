export interface ChildDataModel {
  id: number;
  parent_id: number;
  name: string;
  is_active: boolean;
  level: number;
  children_data: ChildDataModel[];
}
