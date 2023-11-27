export interface StockValueMapModel {
  available: number[];
  discovered: number[];
  reserved: number[];
  inTransit: number[];
  deliveryProcessing: number[];
  awaitingSAV: number[];
  delivered: number[];
  gotOut: number[];
  pendingInvestigation: number[];
  lost: number[];
  isDead: number[];
  pendingReception: number[];
}
