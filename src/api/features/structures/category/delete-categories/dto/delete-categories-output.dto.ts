export class DeleteCategoriesOutput {
  totalItemsDeleted: number;
  status: boolean;

  constructor(totalItemsDeleted: number, status: boolean) {
    this.totalItemsDeleted = totalItemsDeleted;
    this.status = status;
  }
}
