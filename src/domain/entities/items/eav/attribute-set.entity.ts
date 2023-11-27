import { DbBaseEntity, TString } from '@glosuite/shared';
import { Column, Entity, OneToMany } from 'typeorm';
import { Category } from '../../structures';
import { Product } from '../product.entity';
import { AttributeOption } from './attribute-option.entity';

@Entity('attribute-set')
export class AttributeSet extends DbBaseEntity {
  @Column({
    nullable: true,
  })
  magentoId?: number;

  @Column({ unique: true })
  title: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  description?: TString;

  @OneToMany(() => Product, (product) => product.attributeSet)
  products: Product[];

  @OneToMany(() => Category, (cat) => cat.attributeSet)
  categories: Category[];

  @OneToMany(() => AttributeOption, (option) => option.attributeSet)
  options: AttributeOption[];

  @Column({
    nullable: true,
    type: Date,
  })
  magentoCreatedAt?: Date;

  @Column({
    nullable: true,
    type: Date,
  })
  magentoUpdatedAt?: Date;
}
