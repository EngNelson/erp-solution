export class DeleteUnitsOutput {
  totalItemsDeleted: number;
  status: boolean;

  constructor(totalItemsDeleted: number, status: boolean) {
    this.totalItemsDeleted = totalItemsDeleted;
    this.status = status;
  }
}
