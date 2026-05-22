import Order from "./Order.js";
import OrderType from "./OrderType.js";

class AddOrder {
  #storage;
  #fileLogger;
  #type;

  constructor(storage, fileLogger, type) {
    this.#storage = storage;
    this.#fileLogger = fileLogger;
    this.#type = type;
  }

  execute() {
    const pendingOrderArray = this.#storage.getPendingOrderArray();
    const newOrderId = this.#storage.getNewOrderId();

    if (this.#type === OrderType.VIP) {
      const lastVipOrderIndex = pendingOrderArray.findLastIndex(
        (o) => o.type === OrderType.VIP
      );

      this.#storage.addOrder(
        new Order(this.#type, newOrderId),
        lastVipOrderIndex + 1
      );

      this.#fileLogger.log(
        `Created VIP Order #${newOrderId} - Status: PENDING`
      );
    } else {
      this.#storage.addOrder(new Order(this.#type, newOrderId));

      this.#fileLogger.log(
        `Created Normal Order #${newOrderId} - Status: PENDING`
      );
    }
  }
}

export default AddOrder;
