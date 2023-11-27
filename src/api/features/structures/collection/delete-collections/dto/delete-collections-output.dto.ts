export class DeleteCollectionsOutput {
  totalItemsDeleted: number;

  constructor(totalItemsDeleted: number) {
    this.totalItemsDeleted = totalItemsDeleted;
  }
}
