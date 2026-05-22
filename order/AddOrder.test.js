import MockFileLogger from "../MockFileLogger";
import Storage from "../Storage";
import AddOrder from "./AddOrder";
import OrderType from "./OrderType";

let storage;
let fileLogger;

beforeEach(() => {
  storage = new Storage();
  fileLogger = new MockFileLogger();
});

describe("AddOrder", () => {
  describe("execute", () => {
    describe("when add multiple orders", () => {
      it("should have orders with correct id", () => {
        const ao1 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
        const ao2 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
        const ao3 = new AddOrder(storage, fileLogger, OrderType.NORMAL);

        ao1.execute();
        ao2.execute();
        ao3.execute();

        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(3);
        const order1 = pendingOrderArray[0];
        expect(order1.id).toBe(1);
        const order2 = pendingOrderArray[1];
        expect(order2.id).toBe(2);
        const order3 = pendingOrderArray[2];
        expect(order3.id).toBe(3);
      });
    });

    describe("when add normal order", () => {
      it("should be in pendingOrderArray", () => {
        const ao = new AddOrder(storage, fileLogger, OrderType.NORMAL);

        ao.execute();

        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(1);
        const order = pendingOrderArray[0];
        expect(order.type).toBe(OrderType.NORMAL);
      });
    });

    describe("when add vip order", () => {
      it("should be in pendingOrderArray", () => {
        const ao = new AddOrder(storage, fileLogger, OrderType.VIP);

        ao.execute();

        const pendingOrderArray = storage.getPendingOrderArray();
        expect(pendingOrderArray).toHaveLength(1);
        const order = pendingOrderArray[0];
        expect(order.type).toBe(OrderType.VIP);
      });

      describe("when there is 1 normal order in the queue", () => {
        it("should be index 0 of pendingOrderArray", () => {
          const ao1 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
          const ao2 = new AddOrder(storage, fileLogger, OrderType.VIP);

          ao1.execute();
          ao2.execute();

          const pendingOrderArray = storage.getPendingOrderArray();
          expect(pendingOrderArray).toHaveLength(2);
          const order = pendingOrderArray[0];
          expect(order.type).toBe(OrderType.VIP);
        });
      });

      describe("when there are 2 normal order in the queue", () => {
        it("should be index 0 of pendingOrderArray", () => {
          const ao1 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
          const ao2 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
          const ao3 = new AddOrder(storage, fileLogger, OrderType.VIP);

          ao1.execute();
          ao2.execute();
          ao3.execute();

          const pendingOrderArray = storage.getPendingOrderArray();
          expect(pendingOrderArray).toHaveLength(3);
          const order = pendingOrderArray[0];
          expect(order.type).toBe(OrderType.VIP);
        });
      });

      describe("when there are 1 VIP & 1 normal orders in the queue", () => {
        it("should be index 1 of pendingOrderArray", () => {
          const ao1 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
          const ao2 = new AddOrder(storage, fileLogger, OrderType.VIP);
          const ao3 = new AddOrder(storage, fileLogger, OrderType.VIP);

          ao1.execute();
          ao2.execute();
          ao3.execute();

          const pendingOrderArray = storage.getPendingOrderArray();
          expect(pendingOrderArray).toHaveLength(3);
          const order = pendingOrderArray[1];
          expect(order.type).toBe(OrderType.VIP);
          expect(order.id).toBe(3);
        });
      });

      describe("when there are 2 VIP & 1 normal orders in the queue", () => {
        it("should be index 2 of pendingOrderArray", () => {
          const ao1 = new AddOrder(storage, fileLogger, OrderType.NORMAL);
          const ao2 = new AddOrder(storage, fileLogger, OrderType.VIP);
          const ao3 = new AddOrder(storage, fileLogger, OrderType.VIP);
          const ao4 = new AddOrder(storage, fileLogger, OrderType.VIP);

          ao1.execute();
          ao2.execute();
          ao3.execute();
          ao4.execute();

          const pendingOrderArray = storage.getPendingOrderArray();
          expect(pendingOrderArray).toHaveLength(4);
          const order = pendingOrderArray[2];
          expect(order.type).toBe(OrderType.VIP);
          expect(order.id).toBe(4);
        });
      });
    });
  });
});
