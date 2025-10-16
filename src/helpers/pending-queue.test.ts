import { PendingQueue } from "./pending-queue";

describe("PendingQueue priority", () => {
  test("VIP should be served before normal", () => {
    const q = new PendingQueue();
    q.enqueue({ id: 1, isVip: false, createdAt: new Date() });
    q.enqueue({ id: 2, isVip: false, createdAt: new Date() });
    q.enqueue({ id: 3, isVip: true, createdAt: new Date() });
    expect(q.vipSize()).toBe(1);
    expect(q.normalSize()).toBe(2);
    const first = q.dequeue();
    expect(first?.id).toBe(3);
  });

  test("VIP FIFO among VIPs (earlier VIP first)", () => {
    const q = new PendingQueue();
    q.enqueue({ id: 1, isVip: false, createdAt: new Date() });
    q.enqueue({ id: 2, isVip: true, createdAt: new Date() }); // VIP #2
    q.enqueue({ id: 3, isVip: true, createdAt: new Date() }); // VIP #3
    const first = q.dequeue();
    const second = q.dequeue();
    expect(first?.id).toBe(2);
    expect(second?.id).toBe(3);
  });
});
