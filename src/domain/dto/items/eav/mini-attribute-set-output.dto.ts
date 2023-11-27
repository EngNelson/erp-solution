import { AttributeSet } from 'src/domain/entities/items/eav';

export class MiniAttributeSetOutput {
  constructor(attributeSet: AttributeSet) {
    this.id = attributeSet.id;
    // this.magentoId = attributeSet.magentoId ? attributeSet.magentoId : null;
    this.title = attributeSet.title;
    // this.description = attributeSet.description
    //   ? getLangOrFirstAvailableValue(attributeSet.description, lang)
    //   : null;
    this.lastUpdate = attributeSet.lastUpdate ? attributeSet.lastUpdate : null;
  }

  id: string;
  // magentoId?: number;
  title: string;
  // description?: string;
  lastUpdate?: Date;
}
