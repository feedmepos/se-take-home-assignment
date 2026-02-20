import { Order } from "./order";
import { log } from "../utils/logger";
import { LogType } from "../types";

const { BOT_PROCESS, BOT_COMPLETE, BOT_STOP } = LogType;

export class Bot {
  // constructor: id, onComplete()
  // getter: isIdle()
  // methods: process(), stop()

  private currentOrder: Order | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    public readonly id: number,
    private onComplete: () => void,
  ) {}

  get isIdle(): boolean {
    return this.currentOrder === null;
  }

  process(order: Order): void {
    // store current order
    this.currentOrder = order;

    // pending -> processing
    order.process();

    log(BOT_PROCESS, {
      bot_id: this.id,
      order_id: order.id,
      order_type: order.type,
      order_status: order.status,
    });

    // 10 seconds later, complete the order
    this.timer = setTimeout(() => {
      // processing -> complete
      order.complete();

      log(BOT_COMPLETE, {
        bot_id: this.id,
        order_id: order.id,
        order_type: order.type,
        order_status: order.status,
      });

      // reset all state
      this.currentOrder = null;
      this.timer = null;

      // dispatch and process next order
      this.onComplete();
    }, 10000);
  }

  stop(): Order | null {
    // clear and reset timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // store current order
    const order = this.currentOrder;

    if (order) {
      log(BOT_STOP, {
        bot_id: this.id,
        order_id: order.id,
        order_type: order.type,
        order_status: order.status,
      });
    }

    // reset current order
    this.currentOrder = null;

    return order;
  }
}
