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

    findAll(filter?: Partial<Order>) {
        if (!filter) {
            return orders;
        }

        const keys = Object.keys(filter) as (keyof Order)[];

        return orders.filter(order => keys.every(key => order[key] === filter[key]));
    }

    update(id: number, data: Partial<Order>) {
        const index = orders.findIndex(row => row.id === id);

        if (index === -1) {
            return undefined;
        }

        const updatedOrder = {
            ...orders[index],
            ...data,
        };

        orders[index] = updatedOrder;

        return updatedOrder;
    }
}