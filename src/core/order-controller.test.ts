import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTime } from './format';
import { OrderController } from './order-controller';

// ---------------------------------------------------------------------------
// All tests use vi.useFakeTimers() so 10s advances instantly and completedAt
// is deterministic. The injected systemScheduler delegates to globals, which
// Vitest patches — no custom Scheduler implementation needed.
// ---------------------------------------------------------------------------

const START_TIME = new Date('2024-01-01T12:00:00.000Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Queue ordering
// ---------------------------------------------------------------------------

describe('order ordering', () => {
  it('Normal order appends to the back of pending', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // id 1
    ctrl.addNormalOrder(); // id 2
    const { pending } = ctrl.getSnapshot();
    expect(pending).toHaveLength(2);
    expect(pending[0]?.id).toBe(1);
    expect(pending[1]?.id).toBe(2);
  });

  it('VIP order sorts ahead of all Normals but behind existing VIPs', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // id 1
    ctrl.addVipOrder(); // id 2 — jumps ahead
    ctrl.addNormalOrder(); // id 3 — stays at back
    ctrl.addVipOrder(); // id 4 — behind id 2 VIP, ahead of normals
    const { pending } = ctrl.getSnapshot();
    expect(pending.map((o) => [o.id, o.type])).toEqual([
      [2, 'VIP'],
      [4, 'VIP'],
      [1, 'NORMAL'],
      [3, 'NORMAL'],
    ]);
  });

  it('order ids are strictly increasing and unique', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // id 1
    ctrl.addVipOrder(); // id 2
    ctrl.addNormalOrder(); // id 3
    const { pending } = ctrl.getSnapshot();
    const ids = pending.map((o) => o.id);
    // All ids unique
    expect(new Set(ids).size).toBe(ids.length);
    // Ids are monotonically assigned; the queue is sorted by (type, id) so the
    // VIP (id=2) leads, then Normal-1, Normal-3.
    expect(ids).toEqual([2, 1, 3]);
    // Confirm the id counter never goes backwards
    expect(Math.max(...ids)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Bot lifecycle
// ---------------------------------------------------------------------------

describe('bot lifecycle', () => {
  it('+Bot immediately consumes a pending order', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // id 1
    expect(ctrl.getSnapshot().pending).toHaveLength(1);

    ctrl.addBot();
    const snap = ctrl.getSnapshot();
    expect(snap.pending).toHaveLength(0);
    expect(snap.processing).toHaveLength(1);
    expect(snap.bots[0]?.status).toBe('PROCESSING');
  });

  it('bot processes front order in 10s → COMPLETE → picks next → idles when empty', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // id 1
    ctrl.addNormalOrder(); // id 2
    ctrl.addBot();

    // After +Bot: bot is processing order 1; order 2 is still pending
    expect(ctrl.getSnapshot().bots[0]?.status).toBe('PROCESSING');
    expect(ctrl.getSnapshot().pending).toHaveLength(1);

    // 10s later: order 1 completes, bot picks up order 2
    vi.advanceTimersByTime(10_000);
    expect(ctrl.getSnapshot().complete).toHaveLength(1);
    expect(ctrl.getSnapshot().complete[0]?.id).toBe(1);
    expect(ctrl.getSnapshot().pending).toHaveLength(0);
    expect(ctrl.getSnapshot().bots[0]?.status).toBe('PROCESSING');

    // 10s later: order 2 completes, bot goes IDLE
    vi.advanceTimersByTime(10_000);
    expect(ctrl.getSnapshot().complete).toHaveLength(2);
    expect(ctrl.getSnapshot().bots[0]?.status).toBe('IDLE');
  });

  it('bot stays IDLE when no pending orders exist', () => {
    const ctrl = new OrderController();
    ctrl.addBot();
    expect(ctrl.getSnapshot().bots[0]?.status).toBe('IDLE');
  });
});

// ---------------------------------------------------------------------------
// HEADLINE: -Bot mid-process returns order to exact original slot, no leak
// ---------------------------------------------------------------------------

describe('-Bot', () => {
  it('removes the newest (highest-id) bot', () => {
    const ctrl = new OrderController();
    ctrl.addBot(); // id 1
    ctrl.addBot(); // id 2
    ctrl.removeBot();
    const { bots } = ctrl.getSnapshot();
    expect(bots).toHaveLength(1);
    expect(bots[0]?.id).toBe(1); // bot 2 was removed
  });

  it('mid-process: returns order to its exact original slot and cancels timer (no leak)', () => {
    const ctrl = new OrderController();
    // Queue: VIP-1, NORMAL-2, NORMAL-3
    ctrl.addVipOrder(); // id 1
    ctrl.addNormalOrder(); // id 2
    ctrl.addNormalOrder(); // id 3

    // Add 1 bot — it picks up VIP-1 (front of queue)
    ctrl.addBot();
    expect(ctrl.getSnapshot().bots[0]?.status).toBe('PROCESSING');
    expect(ctrl.getSnapshot().pending).toHaveLength(2); // NORMAL-2, NORMAL-3

    // Remove the bot mid-process
    ctrl.removeBot();
    const snap = ctrl.getSnapshot();

    // Bot is gone
    expect(snap.bots).toHaveLength(0);
    // VIP-1 is back at the front, exactly where it was
    expect(snap.pending).toHaveLength(3);
    expect(snap.pending[0]?.id).toBe(1);
    expect(snap.pending[0]?.type).toBe('VIP');
    // Normals follow in original order
    expect(snap.pending[1]?.id).toBe(2);
    expect(snap.pending[2]?.id).toBe(3);
    // Nothing completed
    expect(snap.complete).toHaveLength(0);

    // Advance well past 10s — the cancelled timer must NOT fire a stray completion
    vi.advanceTimersByTime(15_000);
    expect(ctrl.getSnapshot().complete).toHaveLength(0);
  });

  it('mid-process: a new bot picks the returned order from its correct slot', () => {
    const ctrl = new OrderController();
    ctrl.addVipOrder(); // id 1
    ctrl.addNormalOrder(); // id 2
    ctrl.addBot();

    // Bot is processing VIP-1; remove it
    ctrl.removeBot();
    expect(ctrl.getSnapshot().pending[0]?.id).toBe(1); // VIP-1 back at front

    // Add a new bot — it should pick up VIP-1 first
    ctrl.addBot();
    expect(ctrl.getSnapshot().bots[0]?.status).toBe('PROCESSING');
    const processingBot = ctrl.getSnapshot().bots[0];
    expect(processingBot?.status === 'PROCESSING' && processingBot.currentOrderId).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Parallel bots — no double-assignment
// ---------------------------------------------------------------------------

describe('parallel bots', () => {
  it('two bots process different orders simultaneously', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // id 1
    ctrl.addNormalOrder(); // id 2
    ctrl.addBot();
    ctrl.addBot();

    const snap = ctrl.getSnapshot();
    expect(snap.processing).toHaveLength(2);
    // Each order assigned to exactly one bot
    const assignedIds = snap.processing.map((o) => o.id);
    expect(new Set(assignedIds).size).toBe(2);
    expect(snap.pending).toHaveLength(0);
  });

  it('two bots never double-assign one order', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // only one order

    ctrl.addBot(); // bot 1 takes the order
    ctrl.addBot(); // bot 2 should be IDLE

    const snap = ctrl.getSnapshot();
    expect(snap.processing).toHaveLength(1);
    const idleBots = snap.bots.filter((b) => b.status === 'IDLE');
    expect(idleBots).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// completedAt and stable snapshot reference
// ---------------------------------------------------------------------------

describe('completedAt', () => {
  it('sets completedAt on completion and formatTime yields HH:MM:SS', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder();
    ctrl.addBot();

    // advanceTimersByTime also advances system time, so completedAt = START_TIME + 10s
    vi.advanceTimersByTime(10_000);

    const { complete } = ctrl.getSnapshot();
    expect(complete).toHaveLength(1);
    const completedOrder = complete[0];
    expect(completedOrder).toBeDefined();
    if (completedOrder === undefined) return;

    expect(completedOrder.completedAt).toBe(START_TIME + 10_000);
    // 2024-01-01T12:00:00Z + 10s = 12:00:10 UTC
    expect(formatTime(completedOrder.completedAt)).toBe('12:00:10');
  });
});

describe('getSnapshot() reference stability', () => {
  it('returns the same reference on consecutive reads without state change', () => {
    const ctrl = new OrderController();
    const s1 = ctrl.getSnapshot();
    const s2 = ctrl.getSnapshot();
    expect(s1).toBe(s2); // strict reference equality
  });

  it('returns a new reference after a state change', () => {
    const ctrl = new OrderController();
    const before = ctrl.getSnapshot();
    ctrl.addNormalOrder();
    const after = ctrl.getSnapshot();
    expect(before).not.toBe(after);
  });
});
