import { CustomerType, Order } from "../models";
import { orders } from "../stores";

export class OrderController {
    private nextId = 1;

    create(customer: CustomerType) {
        const order: Order = {
            id: this.nextId++,
            status: "PENDING",
            customer,
        };

        if (customer === "VIP") {
            const lastVipIndex = orders.findLastIndex((row) => row.customer === "VIP");
            orders.splice(lastVipIndex + 1, 0, order);
        } else {
            orders.push(order)
        }

        return order;
    }

    findAll() {
        return orders;
    }
}