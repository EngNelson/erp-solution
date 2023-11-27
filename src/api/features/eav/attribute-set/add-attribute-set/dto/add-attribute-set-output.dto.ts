import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { MiniAttributeOptionOutput } from 'src/domain/dto/items/eav';
import { AttributeOption, AttributeSet } from 'src/domain/entities/items/eav';

export class AddAttributeSetOutput {
  constructor(
    attributeSet: AttributeSet,
    lang: ISOLang,
    attributeOptions?: AttributeOption[],
  ) {
    this.id = attributeSet.id;
    this.title = attributeSet.title;
    this.description = attributeSet.description
      ? getLangOrFirstAvailableValue(attributeSet.description, lang)
      : null;
    this.attributeOptions = attributeOptions
      ? attributeOptions.map(
          (option) => new MiniAttributeOptionOutput(option, lang),
        )
      : [];
    this.createdAt = attributeSet.createdAt;
    this.lastUpdate = attributeSet.lastUpdate;
  }

  id: string;
  title: string;
  description?: string;
  attributeOptions?: MiniAttributeOptionOutput[];
  createdAt: Date;
  lastUpdate: Date;
}
