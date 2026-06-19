import { OrderController } from "@/controllers";
import { orders } from "@/stores";

describe("Order Controller", () => {
    let controller: OrderController;

    beforeAll(() => {
        controller = new OrderController()
    });

    describe("Create Order", () => {
        beforeEach(() => {
            orders.splice(0, orders.length)
        })

        it("should create new order", () => {
            const newOrder = controller.create("REGULAR");
            const orders = controller.findAll();

            expect(orders).toHaveLength(1);
            expect(newOrder).toStrictEqual({
                id: expect.any(Number),
                customer: "REGULAR",
                status: "PENDING"
            })
        })

        it("should create new vip order", () => {
            const newOrder = controller.create("VIP");
            const orders = controller.findAll();

            expect(orders).toHaveLength(1);
            expect(newOrder).toStrictEqual({
                id: expect.any(Number),
                customer: "VIP",
                status: "PENDING"
            })
        })

        it("should be no duplicate id", () => {
            controller.create("REGULAR");
            controller.create("REGULAR");
            controller.create("VIP");

            const ids = new Set(orders.map(row => row.id));

            expect(ids.size).toBe(orders.length)
        })

        it("should create multiple order", () => {
            const newOrderList = [
                controller.create("REGULAR"),
                controller.create("REGULAR")
            ]
            const orders = controller.findAll();

            expect(orders).toHaveLength(2);

            for (const order of newOrderList) {
                expect(order).toStrictEqual({
                    id: expect.any(Number),
                    customer: "REGULAR",
                    status: "PENDING"
                })
            }
        })

        it("should prioritize vip order", () => {
            const result = [
                controller.create("REGULAR"),
                controller.create("REGULAR"),
                controller.create("VIP"),
            ]

            expect(result.every(row => Boolean(row.id))).toBeTruthy();
            expect(orders).toHaveLength(3);
            expect(orders.at(0)?.customer).toBe("VIP")
        })

        it("should queue next vip order behind existing vip", () => {
            const result = [
                controller.create("REGULAR"),
                controller.create("REGULAR"),
                controller.create("VIP"),
                controller.create("REGULAR"),
                controller.create("VIP"),
            ]

            expect(result.every(row => Boolean(row.id))).toBeTruthy();
            expect(orders).toHaveLength(5);
            expect(orders.at(0)?.customer).toBe("VIP")
            expect(orders.at(1)?.customer).toBe("VIP")
        })

        it("should keep increasing ids even after an order is removed", () => {
            const first = controller.create("REGULAR");
            const second = controller.create("REGULAR");
            const third = controller.create("REGULAR");

            const previousMaxId = Math.max(first.id, second.id, third.id);

            orders.splice(1, 1)

            const fourth = controller.create("REGULAR");

            expect(fourth.id).toBeGreaterThan(previousMaxId);

            const ids = orders.map(row => row.id);
            expect(new Set(ids).size).toBe(ids.length)
        })

        it("should preserve relative order of regular orders when a vip order is inserted between them", () => {
            const regular1 = controller.create("REGULAR");
            const vip = controller.create("VIP");
            const regular2 = controller.create("REGULAR");

            expect(orders.map(row => row.id)).toStrictEqual([vip.id, regular1.id, regular2.id])
        })
    })

    describe("Find All Orders", () => {
        beforeEach(() => {
            orders.splice(0, orders.length)
        })

        it("should return an empty list when no orders exist", () => {
            expect(controller.findAll()).toStrictEqual([]);
        })

        it("should return all created orders", () => {
            const first = controller.create("REGULAR");
            const second = controller.create("VIP");

            expect(controller.findAll()).toStrictEqual([second, first]);
        })

        it("should return the same reference as the underlying store", () => {
            controller.create("REGULAR");

            expect(controller.findAll()).toBe(orders);
        })

        it("should reflect subsequent changes to the store", () => {
            controller.create("REGULAR");
            const result = controller.findAll();

            expect(result).toHaveLength(1);

            controller.create("VIP");

            expect(result).toHaveLength(2);
        })
    })
})