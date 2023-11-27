import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoryService {
  async generateCategorySumbol(title: string): Promise<string> {
    const titleInArray = title.split(' ');
    let symbol = '';

    if (titleInArray.length === 1) {
      symbol = title.slice(0, 1).toUpperCase();
    }

    let qty = 0;
    titleInArray.map((item) => {
      qty++;

      if (qty <= 4 && item.length > 2 && !item.includes("'")) {
        symbol += item.slice(0, 1).toUpperCase();
      }
    });

    return symbol;
  }
}
