import { BotController, OrderController } from "@/controllers";
import { bots, orders } from "@/stores";

describe("Bot Controller", () => {
    let botController: BotController;
    let orderController: OrderController;

    beforeAll(() => {
        botController = new BotController();
        orderController = new OrderController();
    })

    beforeEach(() => {
        jest.useFakeTimers();
        orders.splice(0, orders.length);
        bots.splice(0, bots.length);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("Add Bot", () => {
        it("should create a new idle bot when there is no pending order", () => {
            const bot = botController.addBot();

            expect(bot).toStrictEqual({
                id: expect.any(Number),
                status: "IDLE",
            });
            expect(bots).toHaveLength(1);
        });

        it("should immediately start processing a pending order", () => {
            const order = orderController.create("Normal");
            const bot = botController.addBot();

            expect(bot.status).toBe("PROCESSING");
            expect(bot.currentOrderId).toBe(order.id);
            expect(orderController.findAll({ id: order.id })[0].status).toBe("PROCESSING");
        });

        it("should move order to complete after 10 seconds", () => {
            const order = orderController.create("Normal");
            botController.addBot();

            jest.advanceTimersByTime(10_000);

            expect(orderController.findAll({ id: order.id })[0].status).toBe("COMPLETE");
        });

        it("should pick up next pending order after completing the previous one", () => {
            const first = orderController.create("Normal");
            const second = orderController.create("Normal");
            const bot = botController.addBot();

            expect(bot.currentOrderId).toBe(first.id);

            jest.advanceTimersByTime(10_000);

            expect(bot.currentOrderId).toBe(second.id);
            expect(orderController.findAll({ id: first.id })[0].status).toBe("COMPLETE");
            expect(orderController.findAll({ id: second.id })[0].status).toBe("PROCESSING");
        });

        it("should become idle again when there is no more pending order", () => {
            orderController.create("Normal");
            const bot = botController.addBot();

            jest.advanceTimersByTime(10_000);

            expect(bot.status).toBe("IDLE");
            expect(bot.currentOrderId).toBeUndefined();
        });
    });

    describe("Remove Bot", () => {
        it("should destroy the bot matching the given id", () => {
            const first = botController.addBot();
            const second = botController.addBot();
            const removed = botController.removeBot(second.id);

            expect(removed).toStrictEqual(second);
            expect(bots).toStrictEqual([first]);
        });

        it("should remove a bot in the middle without affecting the others", () => {
            const first = botController.addBot();
            const second = botController.addBot();
            const third = botController.addBot();
            const removed = botController.removeBot(second.id);

            expect(removed).toStrictEqual(second);
            expect(bots).toStrictEqual([first, third]);
        });

        it("should return undefined when there is no bot to remove", () => {
            expect(botController.removeBot(1)).toBeUndefined();
        });

        it("should return undefined when the id does not match any bot", () => {
            const bot = botController.addBot();

            expect(botController.removeBot(bot.id + 1)).toBeUndefined();
            expect(bots).toStrictEqual([bot]);
        });

        it("should stop processing and return the order to pending", () => {
            const order = orderController.create("Normal");

            const bot = botController.addBot();
            botController.removeBot(bot.id);

            expect(orderController.findAll({ id: order.id })[0].status).toBe("PENDING");
            expect(bots).toHaveLength(0);
        });

        it("should not complete the order even after 10 seconds once the bot is removed", () => {
            const order = orderController.create("Normal");

            const bot = botController.addBot();
            botController.removeBot(bot.id);

            jest.advanceTimersByTime(10_000);

            expect(orderController.findAll({ id: order.id })[0].status).toBe("PENDING");
        });

        it("should preserve VIP/Normal priority when an order returns to pending", () => {
            const normal1 = orderController.create("Normal");
            const vip = orderController.create("VIP");
            const normal2 = orderController.create("Normal");
            const bot = botController.addBot();

            expect(bot.currentOrderId).toBe(vip.id);

            botController.removeBot(bot.id);

            expect(orders.map((row) => row.id)).toStrictEqual([vip.id, normal1.id, normal2.id]);
            expect(orderController.findAll({ id: vip.id })[0].status).toBe("PENDING");
        });

        it("should let another bot pick up an order freed by a removed bot", () => {
            const order = orderController.create("Normal");
            const bot = botController.addBot();
            botController.removeBot(bot.id);

            const secondBot = botController.addBot();

            expect(secondBot.currentOrderId).toBe(order.id);
            expect(secondBot.status).toBe("PROCESSING");
        });
    });
});
