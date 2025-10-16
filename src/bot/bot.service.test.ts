import { BotService } from "./bot.service";
import { Order } from "../entities/order.type";

jest.setTimeout(15000);

function makeOrder(id: number, isVip = false): Order {
  return { id, isVip, createdAt: new Date() };
}

describe("BotService", () => {
  test("starts and completes an order in ~10s", async () => {
    const completed: number[] = [];
    const bot = new BotService(1, {
      onCompleted: (co) => completed.push(co.id),
      onStopped: () => void 0,
    });
    const started = bot.tryStart(makeOrder(1));
    expect(started).toBe(true);
    expect(bot.isBusy()).toBe(true);
    await new Promise((res) => setTimeout(res, 10500));
    expect(bot.isBusy()).toBe(false);
    expect(completed).toEqual([1]);
  });

  test("stop() cancels work and returns order via onStopped", async () => {
    let returned: Order | undefined;
    const bot = new BotService(2, {
      onCompleted: () => void 0,
      onStopped: (o) => (returned = o),
    });
    bot.tryStart(makeOrder(2));
    expect(bot.isBusy()).toBe(true);
    bot.stop();
    expect(bot.isBusy()).toBe(false);
    expect(returned?.id).toBe(2);
  });
});
