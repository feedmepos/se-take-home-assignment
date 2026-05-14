import { OrderQueue } from '../OrderQueue';

describe('OrderQueue', () => {
  let queue: OrderQueue;

  beforeEach(() => {
    queue = new OrderQueue();
  });

  describe('enqueue', () => {
    it('assigns unique incrementing ids', () => {
      const o1 = queue.enqueue('NORMAL');
      const o2 = queue.enqueue('NORMAL');
      expect(o1.id).toBe(1);
      expect(o2.id).toBe(2);
    });

    it('places Normal orders at the back', () => {
      queue.enqueue('NORMAL'); // #1
      queue.enqueue('NORMAL'); // #2
      const all = queue.getAll();
      expect(all[0].id).toBe(1);
      expect(all[1].id).toBe(2);
    });

    it('places VIP orders in front of all Normal orders', () => {
      queue.enqueue('NORMAL'); // #1
      queue.enqueue('NORMAL'); // #2
      queue.enqueue('VIP');   // #3 → should jump before #1 and #2
      const all = queue.getAll();
      expect(all[0].id).toBe(3);
      expect(all[0].type).toBe('VIP');
    });

    it('places VIP orders behind existing VIP orders (FIFO among VIPs)', () => {
      queue.enqueue('VIP');   // #1
      queue.enqueue('NORMAL'); // #2
      queue.enqueue('VIP');   // #3 → behind #1, in front of #2
      const all = queue.getAll();
      expect(all[0].id).toBe(1);
      expect(all[1].id).toBe(3);
      expect(all[2].id).toBe(2);
    });
  });

  describe('dequeue', () => {
    it('returns undefined on an empty queue', () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it('returns the first order in FIFO order', () => {
      queue.enqueue('VIP');
      queue.enqueue('NORMAL');
      const first = queue.dequeue();
      expect(first?.type).toBe('VIP');
      expect(queue.size).toBe(1);
    });
  });

  describe('requeue', () => {
    it('restores a VIP order before higher-id VIPs when returned to the queue', () => {
      queue.enqueue('VIP');    // #1
      queue.enqueue('VIP');    // #2
      queue.enqueue('VIP');    // #3
      queue.enqueue('NORMAL'); // #4
      // Queue: [VIP#1, VIP#2, VIP#3, Normal#4]

      // A bot picks up #1, another picks up #2 — removing them from the queue
      queue.dequeue(); // VIP#1 picked up by a bot
      const returned = queue.dequeue()!; // VIP#2 picked up, then bot is removed
      // Queue: [VIP#3, Normal#4]

      returned.status = 'PROCESSING';
      queue.requeue(returned); // VIP#2 returned → should go before VIP#3
      // Expected queue: [VIP#2, VIP#3, Normal#4]

      const all = queue.getAll();
      expect(all[0].id).toBe(2);
      expect(all[1].id).toBe(3);
      expect(all[2].id).toBe(4);
    });

    it('restores a Normal order behind all VIPs and lower-id Normals', () => {
      queue.enqueue('VIP');    // #1
      queue.enqueue('NORMAL'); // #2
      queue.enqueue('NORMAL'); // #3
      // Queue: [VIP#1, Normal#2, Normal#3]

      queue.dequeue(); // VIP#1 picked up
      const returned = queue.dequeue()!; // Normal#2 picked up, then bot removed
      // Queue: [Normal#3]

      returned.status = 'PROCESSING';
      queue.requeue(returned); // Normal#2 returned → should go before Normal#3
      // Expected queue: [Normal#2, Normal#3]

      const all = queue.getAll();
      expect(all[0].id).toBe(2);
      expect(all[1].id).toBe(3);
    });
  });
});
