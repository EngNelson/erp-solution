import { OrderProcessing } from 'src/domain/entities/flows';
import { StepStatus } from 'src/domain/enums/flows';
import { OrderStep } from 'src/domain/enums/orders';
import { MiniOrderOutput } from '../orders';

export class OrderProcessingItemOutput {
  constructor(orderProcessing: OrderProcessing) {
    this.id = orderProcessing.id;
    this.reference = orderProcessing.reference;
    this.state = orderProcessing.state;
    this.status = orderProcessing.status;
    this.startDate = orderProcessing.startDate;
    this.endDate = orderProcessing.endDate ? orderProcessing.endDate : null;
    this.order = new MiniOrderOutput(orderProcessing.order);
  }

  id: string;
  reference: string;
  state: OrderStep;
  status: StepStatus;
  startDate: Date;
  endDate?: Date;
  order: MiniOrderOutput;
}

export class MiniOrderProcessingItemOutput {
  constructor(orderProcessing: OrderProcessing) {
    this.id = orderProcessing.id;
    this.reference = orderProcessing.reference;
    this.state = orderProcessing.state;
    this.status = orderProcessing.status;
    this.startDate = orderProcessing.startDate;
    this.endDate = orderProcessing.endDate ? orderProcessing.endDate : null;
  }

  id: string;
  reference: string;
  state: OrderStep;
  status: StepStatus;
  startDate: Date;
  endDate?: Date;
}
