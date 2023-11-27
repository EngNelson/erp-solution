import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { AttributeOption, AttributeSet } from 'src/domain/entities/items/eav';
import { AttributeOptionItemOutput } from '.';

export class AttributeSetItemOutput {
  constructor(
    attributeSet: AttributeSet,
    lang: ISOLang,
    attributeOptions?: AttributeOption[],
  ) {
    this.id = attributeSet.id;
    this.magentoId = attributeSet.magentoId ? attributeSet.magentoId : null;
    this.title = attributeSet.title;
    this.description = attributeSet.description
      ? getLangOrFirstAvailableValue(attributeSet.description, lang)
      : null;
    this.attributeOptions = attributeOptions
      ? attributeOptions.map(
          (option) => new AttributeOptionItemOutput(option, lang),
        )
      : [];
    this.createdAt = attributeSet.createdAt;
    this.lastUpdate = attributeSet.lastUpdate ? attributeSet.lastUpdate : null;
  }

  id: string;
  magentoId?: number;
  title: string;
  description?: string;
  attributeOptions?: AttributeOptionItemOutput[];
  createdAt: Date;
  lastUpdate?: Date;
}
