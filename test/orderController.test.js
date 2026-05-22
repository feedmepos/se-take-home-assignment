const OrderController = require("../src/services/orderController");
jest.useFakeTimers();

describe("McDonald Order Controller", () => 
{
    let mcd;

    beforeEach(() => 
    {
        mcd = new OrderController(false);
    });

    test("VIP orders go before normal orders", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addOrder("VIP");
        mcd.addOrder("NORMAL");

        expect(mcd.orders[0].type).toBe("VIP");
        expect(mcd.orders[1].type).toBe("NORMAL");
        expect(mcd.orders[2].type).toBe("NORMAL");
    });

    test("Normal orders append at the end", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addOrder("NORMAL");
        expect(mcd.orders.map(o => o.type)).toEqual(["NORMAL", "NORMAL"]);
    });

    test("Multiple VIP orders maintain FIFO among VIPs", () => 
    {
        mcd.addOrder("VIP");
        mcd.addOrder("VIP");
        mcd.addOrder("NORMAL");
        expect(mcd.orders.map(o => o.type)).toEqual(["VIP", "VIP", "NORMAL"]);
    });

    test("Adding a bot assigns pending orders", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addBot();

        const bot = mcd.bots[0];
        expect(bot.isBusy).toBe(true);
        expect(mcd.orders.length).toBe(0); 
    });

    test("Bot processes one order at a time", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addOrder("NORMAL");
        mcd.addBot();

        const bot = mcd.bots[0];
        expect(bot.isBusy).toBe(true);
        expect(mcd.orders.length).toBe(1); 
    });

    test("Completed orders move to completed list", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addBot();
        jest.advanceTimersByTime(10000);
        expect(mcd.completed.length).toBe(1);
        expect(mcd.completed[0].status).toBe("COMPLETED");
        expect(mcd.completed[0].type).toBe("NORMAL");
    });

    test("Removing a bot returns unfinished order to pending", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addBot();

        const bot = mcd.bots[0];
        const order = bot.currentOrder;

        mcd.removeBot(); 

        expect(mcd.orders[0]).toBe(order);
        expect(mcd.orders[0].status).toBe("PENDING");
        expect(mcd.bots.length).toBe(0);
    });

    test("Final status counts correctly", () => 
    {
        mcd.addOrder("VIP");
        mcd.addOrder("NORMAL");
        mcd.addBot();

        jest.advanceTimersByTime(10000);

        expect(mcd.completed.filter(o => o.type === "VIP").length).toBe(1);
        expect(mcd.completed.filter(o => o.type === "NORMAL").length).toBe(0);
        expect(mcd.bots[0].currentOrder.type).toBe("NORMAL");
    });

    test("Adding multiple bots processes multiple orders", () => 
    {
        mcd.addOrder("NORMAL");
        mcd.addOrder("VIP");
        mcd.addBot();
        mcd.addBot();

        expect(mcd.orders.length).toBe(0);
        expect(mcd.bots.every(b => b.isBusy)).toBe(true);
    });

});
