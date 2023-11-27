import {
  CustomAttributeModel,
  ExtensionAttributeModel,
  MediaGalleryEntry,
} from '.';

export interface MagentoArticleModel {
  id: number;
  sku: string;
  name: string;
  attribute_set_id: number;
  price: number;
  status: number;
  visibility: number;
  type_id: string;
  created_at: Date;
  updated_at: Date;
  extension_attributes: ExtensionAttributeModel;
  media_gallery_entries: MediaGalleryEntry[];
  custom_attributes: CustomAttributeModel[];
  pageSize?: number;
  currentPage?: number;
  totalCount?: number;
}
