import type { OrderManager } from "./order_manager";
import type { Order } from "./order";

const PROCESSING_TIME_SECOND = 10;

export class Bot {
  private _id;
  private _isWorking = false;
  private _orderManager: OrderManager;
  private _timer: any = null;
  private _processingOrder: Order | undefined;

  constructor(id: number, orderManager: OrderManager) {
    this._id = id;
    this._orderManager = orderManager;
  }

  get id(): number {
    return this._id;
  }

  get isWorking(): boolean {
    return this._isWorking;
  }

  get orderNumber(): number | undefined {
    return this._processingOrder?.id;
  }

  private async _work() {
    if (this._isWorking) return;

    const order = this._orderManager.getNextOrderForProcessing();
    if (order === undefined) return;

    this._processingOrder = order;
    this._isWorking = true;

    this._timer = setTimeout(() => {
      this._orderManager.completeOrder(order);
      this._processingOrder = undefined;
      this._isWorking = false;
      this._timer = null;
      this.start();
    }, PROCESSING_TIME_SECOND * 1000);
  }

  start() {
    this._work();
  }

  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._isWorking = false;

    if (this._processingOrder === undefined) return;
    this._orderManager.returnOrder(this._processingOrder);
  }
}
