export class ImportCatalogOutput {
  constructor(categories: number, collections: number) {
    this.categories = categories;
    this.collections = collections;
  }

  categories: number;
  collections: number;
}
