import { OrderQueue } from '../services/OrderQueue';
import { Order } from '../models/Order';

function makeOrder(id: number, isVip: boolean): Order {
  return { id, isVip, status: 'PENDING' };
}

describe('OrderQueue', () => {
  let queue: OrderQueue;

  beforeEach(() => {
    queue = new OrderQueue();
  });

  it('dequeues VIP orders before normal orders', () => {
    queue.enqueue(makeOrder(1001, false));
    queue.enqueue(makeOrder(1002, true));
    queue.enqueue(makeOrder(1003, false));

    expect(queue.dequeue()?.id).toBe(1002);
    expect(queue.dequeue()?.id).toBe(1001);
    expect(queue.dequeue()?.id).toBe(1003);
  });

  it('maintains FIFO within the same type', () => {
    queue.enqueue(makeOrder(1001, false));
    queue.enqueue(makeOrder(1002, false));
    queue.enqueue(makeOrder(1003, false));

    expect(queue.dequeue()?.id).toBe(1001);
    expect(queue.dequeue()?.id).toBe(1002);
    expect(queue.dequeue()?.id).toBe(1003);
  });

  it('maintains FIFO for VIP orders', () => {
    queue.enqueue(makeOrder(1001, true));
    queue.enqueue(makeOrder(1002, true));

    expect(queue.dequeue()?.id).toBe(1001);
    expect(queue.dequeue()?.id).toBe(1002);
  });

  it('returns null when empty', () => {
    expect(queue.dequeue()).toBeNull();
  });

  it('tracks size correctly', () => {
    expect(queue.size()).toBe(0);
    queue.enqueue(makeOrder(1001, false));
    queue.enqueue(makeOrder(1002, true));
    expect(queue.size()).toBe(2);
    queue.dequeue();
    expect(queue.size()).toBe(1);
  });

  it('getAll returns VIP orders first', () => {
    queue.enqueue(makeOrder(1001, false));
    queue.enqueue(makeOrder(1002, true));
    const all = queue.getAll();
    expect(all[0].isVip).toBe(true);
    expect(all[1].isVip).toBe(false);
  });
});
