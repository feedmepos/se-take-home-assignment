import MockFileLogger from "../MockFileLogger";
import Order from "../order/Order";
import OrderType from "../order/OrderType";
import Storage from "../Storage";
import Bot from "./Bot";
import BotStatus from "./BotStatus";
import RemoveBot from "./RemoveBot";

let storage;
let fileLogger;

beforeEach(() => {
  storage = new Storage();
  fileLogger = new MockFileLogger();
});

describe("RemoveBot", () => {
  describe("execute", () => {
    it("should remove the newest bot", () => {
      const bot1 = new Bot();
      storage.addBot(bot1);
      const bot2 = new Bot();
      bot2.status = BotStatus.PROCESSING;
      storage.addBot(bot2);
      const rb = new RemoveBot(storage, fileLogger);

      rb.execute();

      const botArray = storage.getBotArray();
      expect(botArray).toHaveLength(1);
      const bot = botArray[0];
      expect(bot.status).toBe(BotStatus.IDLE);
    });

    describe("when bot is processing", () => {
      it("should insert order from bot at index 0 of pendingOrderArray and clearTimeout", (done) => {
        const bot = new Bot();
        bot.order = new Order(OrderType.NORMAL, 1);
        bot.status = BotStatus.PROCESSING;
        bot.timeoutId = setTimeout(() => {
          fail("It should not reach here.");
        }, 500);
        storage.addBot(bot);
        storage.addOrder(new Order(OrderType.NORMAL, 2));
        const rb = new RemoveBot(storage, fileLogger);

        rb.execute();

        const botArray = storage.getBotArray();
        expect(botArray).toHaveLength(0);
        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(2);
        const order = pendingOrderArray[0];
        expect(order.id).toBe(1);
        setTimeout(() => {
          done();
        }, 600);
      });
    });
  });
});
