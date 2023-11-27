import {
  ChildDataModel,
  CustomAttributeModel,
  MagentoAttributeOptionModel,
  MagentoFrontendLabelModel,
} from 'src/domain/interfaces/magento';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('crawl-cache')
export class CrawlCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
    unique: true,
  })
  categoryId?: number;

  @Column({ nullable: true })
  parentId?: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  isActive?: boolean;

  @Column({ nullable: true })
  level?: number;

  @Column({ nullable: true })
  createdAt?: Date;

  @Column({ nullable: true })
  updatedAt?: Date;

  @Column({ nullable: true })
  path?: string;

  @Column({ nullable: true, width: 1000 })
  children?: string;

  @Column({ nullable: true })
  includeInMenu?: boolean;

  @Column({ type: 'simple-json', nullable: true })
  customAttributes?: CustomAttributeModel[];

  @Column({ type: 'simple-json', nullable: true })
  childrenData?: ChildDataModel[];

  @Column({ nullable: true, unique: true })
  attributeId?: number;

  @Column({ nullable: true, unique: true })
  attributeCode?: string;

  @Column({ nullable: true })
  frontendInput?: string;

  @Column({ type: 'simple-json', nullable: true })
  options?: MagentoAttributeOptionModel[];

  @Column({ nullable: true })
  isUserDefined?: boolean;

  @Column({ nullable: true })
  defaultFrontendLabel?: string;

  @Column({ nullable: true })
  backendType?: string;

  @Column({ type: 'simple-json', nullable: true })
  frontendLabels?: MagentoFrontendLabelModel[];
}
