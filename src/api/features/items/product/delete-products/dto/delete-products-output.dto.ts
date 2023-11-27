export class DeleteProductsOutput {
  constructor(totalItemsDeleted: number) {
    this.totalItemsDeleted = totalItemsDeleted;
  }
  totalItemsDeleted: number;
}
