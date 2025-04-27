import Order from "@/models/order";
import OrderDispatchService from "./order-dispatch";

export default class OrderService {
  private nextId = 100;
  private orders: Map<number, Order>;
  private orderDispatchService: OrderDispatchService;

  constructor(
    orders: Map<number, Order>,
    orderDispatchService: OrderDispatchService,
  ) {
    this.orders = orders;
    this.orderDispatchService = orderDispatchService;
  }

  public getOrders(): Order[] {
    const sortFn = (a: Order, b: Order) =>
      a.createdAt.localeCompare(b.createdAt);
    const priority = [...this.orders.values().filter((o) => o.isPriority)].sort(
      sortFn,
    );
    const regular = [...this.orders.values().filter((o) => !o.isPriority)].sort(
      sortFn,
    );

    return [...priority, ...regular];
  }

  public createOrder(isPriority = false): Order {
    const order = new Order(this.nextId++, isPriority);
    this.orders.set(order.id, order);
    this.orderDispatchService.enqueue(order);
    return order;
  }
}
