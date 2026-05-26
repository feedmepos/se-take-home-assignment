import { EventEmitter } from 'events';

export type OrderEvent = 'order:completed' | 'bot:status_changed';

export class OrderProcessingEvents {
  private emitter = new EventEmitter();

  emit(event: OrderEvent, payload: unknown): void {
    this.emitter.emit(event, payload);
  }

  on(event: OrderEvent, listener: (payload: unknown) => void): void {
    this.emitter.on(event, listener);
  }

  removeListener(event: OrderEvent, listener: (payload: unknown) => void): void {
    this.emitter.removeListener(event, listener);
  }
}
