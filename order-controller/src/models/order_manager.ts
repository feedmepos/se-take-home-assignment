import { OrderStatus, OrderType } from "@/enums";
import { Order } from "./order";

export class OrderManager {
  private _completedOrders: Order[] = [];
  private _nextOrderId = 1;
  private _orders: Order[] = [];

  get completedOrders(): Order[] {
    return this._completedOrders;
  }

  get orders(): Order[] {
    return this._orders;
  }

  get pendingOrdersLength(): number {
    return this.orders.filter((order) => order.status === OrderStatus.PENDING).length;
  }

  addOrder(type: OrderType): void {
    const newOrder = new Order(this._nextOrderId++, type);
    if (this.orders.length < 1) {
      this.orders.push(newOrder);
      return;
    }

    switch (type) {
      case OrderType.NORMAL:
        this._orders.push(newOrder);
        break;
      case OrderType.VIP:
        for (let i = 0; i < this.orders.length; i++) {
          if (this.orders[i].type === OrderType.NORMAL) {
            this._orders.splice(i, 0, newOrder);
            return;
          } else if (i + 1 === this.orders.length && this.orders[i].type === OrderType.VIP) {
            this.orders.push(newOrder);
            return;
          }
        }
        break;
      default:
        break;
    }
  }

  completeOrder(completedOrder: Order): void {
    completedOrder.status = OrderStatus.COMPLETED;

    const index = this.orders.findIndex((order) => {
      return order.id === completedOrder.id;
    });
    this._orders.splice(index, 1);
    this._completedOrders.push(completedOrder);
  }

  getNextOrderForProcessing(): Order | undefined {
    for (let i = 0; i < this.orders.length; i++) {
      if (this.orders[i].status === OrderStatus.PENDING) {
        this.orders[i].status = OrderStatus.PROCESSING;
        return this.orders[i];
      }
    }
    return;
  }

  returnOrder(targetOrder: Order) {
    this.orders.find((order) => order.id === targetOrder.id)!.status = OrderStatus.PENDING;
  }
}
