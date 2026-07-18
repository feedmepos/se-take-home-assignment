import { describe, expect, it } from 'vitest';
import type { Order } from './order';
import { compareOrders, sortByPriority } from './order-priority';
import { OrderStatus } from './order-status';
import { OrderType } from './order-type';

const order = (id: number, type: OrderType): Order => ({
  id,
  type,
  status: OrderStatus.PENDING,
});

const ids = (orders: Order[]) => orders.map((o) => o.id);

describe('compareOrders', () => {
  it('serves VIP before Normal regardless of id', () => {
    expect(compareOrders(order(9, OrderType.VIP), order(1, OrderType.NORMAL))).toBeLessThan(0);
  });

  it('serves the earlier-created order first within the same tier (FIFO)', () => {
    expect(compareOrders(order(1, OrderType.VIP), order(2, OrderType.VIP))).toBeLessThan(0);
    expect(compareOrders(order(5, OrderType.NORMAL), order(3, OrderType.NORMAL))).toBeGreaterThan(0);
  });
});

describe('sortByPriority', () => {
  it('orders VIPs (FIFO) ahead of Normals (FIFO)', () => {
    const queue = [
      order(1, OrderType.NORMAL),
      order(2, OrderType.VIP),
      order(3, OrderType.NORMAL),
      order(4, OrderType.VIP),
    ];
    expect(ids(sortByPriority(queue))).toEqual([2, 4, 1, 3]);
  });

  it('re-sorts an interrupted order back into its original slot (stable by id)', () => {
    // A bot-interrupted VIP #2 returns to a queue of VIP #5 then Normal #1;
    // because ordering is by (tier, id), it lands back at the front of the VIPs.
    const queue = [
      order(5, OrderType.VIP),
      order(1, OrderType.NORMAL),
      order(2, OrderType.VIP),
    ];
    expect(ids(sortByPriority(queue))).toEqual([2, 5, 1]);
  });
});
