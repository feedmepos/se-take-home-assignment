import { BotStatus } from './types';

export interface BotProps {
  id: number;
  name: string;
  status: BotStatus;
  currentOrderId?: number;
}

export class Bot {
  private props: BotProps;
  timerId?: NodeJS.Timeout;

  constructor(id: number) {
    this.props = {
      id,
      name: `Bot-${id}`,
      status: 'IDLE',
    };
  }

  get id(): number {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): BotStatus {
    return this.props.status;
  }

  get currentOrderId(): number | undefined {
    return this.props.currentOrderId;
  }

  isIdle(): boolean {
    return this.props.status === 'IDLE';
  }

  isProcessing(): boolean {
    return this.props.status === 'PROCESSING';
  }

  assignOrder(orderId: number): void {
    this.props.status = 'PROCESSING';
    this.props.currentOrderId = orderId;
  }

  release(): void {
    this.props.status = 'IDLE';
    this.props.currentOrderId = undefined;
    this.timerId = undefined;
  }

  toJSON(): BotProps {
    return { ...this.props };
  }
}
