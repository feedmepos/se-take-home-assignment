import { OrderType, OrderStatus } from './types';

export interface OrderProps {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  completedAt?: number;
}

export class Order {
  private props: OrderProps;

  constructor(id: number, type: OrderType) {
    this.props = {
      id,
      type,
      status: 'PENDING',
      createdAt: Date.now(),
    };
  }

  get id(): number {
    return this.props.id;
  }

  get type(): OrderType {
    return this.props.type;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get createdAt(): number {
    return this.props.createdAt;
  }

  get completedAt(): number | undefined {
    return this.props.completedAt;
  }

  startProcessing(): void {
    this.props.status = 'PROCESSING';
  }

  complete(): void {
    this.props.status = 'COMPLETE';
    this.props.completedAt = Date.now();
  }

  returnToPending(): void {
    this.props.status = 'PENDING';
  }

  toJSON(): OrderProps {
    return { ...this.props };
  }
}
