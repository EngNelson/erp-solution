export class ImportArticlesOutput {
  constructor(products: number, articles: number, units: number) {
    this.products = products;
    this.articles = articles;
    this.units = units;
  }

  products: number;
  articles: number;
  units: number;
}
