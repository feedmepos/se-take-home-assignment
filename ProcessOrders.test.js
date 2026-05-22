import MockFileLogger from "./MockFileLogger";
import ProcessOrders from "./ProcessOrders";
import Storage from "./Storage";
import Bot from "./bot/Bot";
import BotStatus from "./bot/BotStatus";
import Order from "./order/Order";
import OrderType from "./order/OrderType";

let storage;
let fileLogger;

beforeEach(() => {
  storage = new Storage();
  fileLogger = new MockFileLogger();
});

describe("ProcessOrders", () => {
  describe("execute", () => {
    describe("when 1 bot in idle and 1 pending order", () => {
      it("should have bot 1 process the pending order", () => {
        storage.addBot(new Bot());
        storage.addOrder(new Order(OrderType.NORMAL, 1));
        const po = new ProcessOrders(storage, fileLogger);

        po.execute();

        const bot = storage.getBotArray()[0];
        const order = bot.order;
        expect(order.id).toBe(1);
        expect(bot.status).toBe(BotStatus.PROCESSING);
        expect(bot.timeoutId).toBeDefined();
        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(0);
        clearTimeout(bot.timeoutId);
      });

      it("should have bot 1 move order to completed area once it is done with it", async () => {
        storage.addBot(new Bot());
        storage.addOrder(new Order(OrderType.NORMAL, 1));
        const po = new ProcessOrders(storage, fileLogger, 10);

        po.execute();

        await new Promise((resolve) => setTimeout(resolve, 10));
        const bot = storage.getBotArray()[0];
        expect(bot.order).toBeUndefined();
        expect(bot.status).toBe(BotStatus.IDLE);
        expect(bot.timeoutId).toBeUndefined();
        const completedOrderArray = storage.getCompletedOrderArray();
        expect(completedOrderArray).toHaveLength(1);
      });
    });

    describe("when 1 bot in idle and 2 pending order", () => {
      it("should have bot 1 process first pending order", () => {
        storage.addBot(new Bot());
        storage.addOrder(new Order(OrderType.NORMAL, 1));
        storage.addOrder(new Order(OrderType.NORMAL, 2));
        const po = new ProcessOrders(storage, fileLogger);

        po.execute();

        const bot = storage.getBotArray()[0];
        const order = bot.order;
        expect(order.id).toBe(1);
        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(1);
        clearTimeout(bot.timeoutId);
      });

      it(
        "should have bot 1 move order to completed area once it is done with" +
          " it, and start processing the next one",
        async () => {
          storage.addBot(new Bot());
          storage.addOrder(new Order(OrderType.NORMAL, 1));
          storage.addOrder(new Order(OrderType.NORMAL, 2));
          const po = new ProcessOrders(storage, fileLogger, 10);

          po.execute();

          await new Promise((resolve) => setTimeout(resolve, 10));
          const bot = storage.getBotArray()[0];
          const order = bot.order;
          expect(order.id).toBe(2);
          expect(bot.status).toBe(BotStatus.PROCESSING);
          clearTimeout(bot.timeoutId);
        }
      );
    });

    describe("when 1 bot in processing and 1 pending order", () => {
      it("should have bot 1 not to process the pending order", () => {
        const bot = new Bot();
        bot.status = BotStatus.PROCESSING;
        storage.addBot(bot);
        storage.addOrder(new Order(OrderType.NORMAL, 1));
        const po = new ProcessOrders(storage, fileLogger);

        po.execute();

        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(1);
      });
    });
  });
});
