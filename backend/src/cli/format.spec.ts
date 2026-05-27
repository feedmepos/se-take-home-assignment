import { formatEvent, formatInit, formatSummary, REPORT_HEADER } from './format';
import { DomainEvent, Order, StatusSnapshot } from '../domain/types';

const at = new Date('2025-01-01T14:32:01Z');

const order = (over: Partial<Order> = {}): Order => ({
  id: 1,
  type: 'NORMAL',
  status: 'PENDING',
  createdAt: at,
  ...over,
});

// Helper to verify the HH:MM:SS prefix
function matchesTimestamp(line: string): boolean {
  return /^\[\d{2}:\d{2}:\d{2}\] /.test(line);
}

test('formats with HH:MM:SS prefix', () => {
  const line = formatEvent({ type: 'OrderCreated', order: order({ id: 1, type: 'VIP' }), at });
  expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] /);
  expect(line).toContain('VIP');
  expect(line).toContain('#1');
});

test('OrderCreated renders title-case type, id, and PENDING', () => {
  const e: DomainEvent = { type: 'OrderCreated', order: order({ id: 3, type: 'NORMAL' }), at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Normal Order #3');
  expect(line).toContain('PENDING');
});

test('OrderStarted names the bot, the typed order, and PROCESSING', () => {
  const e: DomainEvent = {
    type: 'OrderStarted',
    order: order({ id: 2, type: 'VIP', status: 'PROCESSING' }),
    botId: 1,
    at,
  };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #1');
  expect(line).toContain('VIP Order #2');
  expect(line).toContain('PROCESSING');
});

test('OrderCompleted includes COMPLETE and the processing duration', () => {
  const started = new Date('2025-01-01T14:32:01Z');
  const completed = new Date('2025-01-01T14:32:11Z'); // +10s
  const e: DomainEvent = {
    type: 'OrderCompleted',
    order: order({
      id: 4,
      type: 'NORMAL',
      status: 'COMPLETE',
      startedAt: started,
      completedAt: completed,
    }),
    botId: 2,
    at: completed,
  };
  const line = formatEvent(e);
  expect(line).toContain('Bot #2');
  expect(line).toContain('Normal Order #4');
  expect(line).toContain('COMPLETE');
  expect(line).toContain('Processing time: 10s');
});

test('OrderRequeued says the order returned to PENDING', () => {
  const e: DomainEvent = {
    type: 'OrderRequeued',
    order: order({ id: 5, type: 'NORMAL', status: 'PENDING' }),
    botId: 3,
    at,
  };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Normal Order #5');
  expect(line).toMatch(/returned to pending/i);
});

test('BotAdded reports created/ACTIVE', () => {
  const e: DomainEvent = { type: 'BotAdded', botId: 1, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #1 created');
  expect(line).toContain('ACTIVE');
});

test('BotRemoved distinguishes IDLE from PROCESSING destruction', () => {
  expect(formatEvent({ type: 'BotRemoved', botId: 2, wasProcessing: false, at })).toContain(
    'destroyed while IDLE',
  );
  expect(formatEvent({ type: 'BotRemoved', botId: 2, wasProcessing: true, at })).toContain(
    'destroyed while PROCESSING',
  );
});

test('BotIdle reports IDLE with no pending orders', () => {
  const e: DomainEvent = { type: 'BotIdle', botId: 1, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #1');
  expect(line).toMatch(/idle/i);
});

test('report header and init line match the expected format', () => {
  expect(REPORT_HEADER).toBe("McDonald's Order Management System - Simulation Results");
  expect(formatInit(at, 0)).toMatch(/^\[\d{2}:\d{2}:\d{2}\] System initialized with 0 bots$/);
});

test('summary tallies orders by type, completion, bots, and pending', () => {
  const snap: StatusSnapshot = {
    pending: [order({ id: 1, type: 'NORMAL' })],
    processing: [{ order: order({ id: 2, type: 'VIP', status: 'PROCESSING' }), botId: 1 }],
    complete: [order({ id: 3, type: 'VIP', status: 'COMPLETE' })],
    bots: [{ id: 1, status: 'PROCESSING', currentOrderId: 2 }],
  };
  const out = formatSummary(snap);
  expect(out).toContain('Total Orders Processed: 3 (2 VIP, 1 Normal)');
  expect(out).toContain('Orders Completed: 1');
  expect(out).toContain('Active Bots: 1');
  expect(out).toContain('Pending Orders: 1');
});
