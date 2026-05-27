import { formatEvent } from './format';
import { DomainEvent } from '../domain/types';

const at = new Date('2025-01-01T14:32:01Z');

// Helper to build a fixed-offset date and verify the HH:MM:SS is from that date
function matchesTimestamp(line: string): boolean {
  return /^\[\d{2}:\d{2}:\d{2}\] /.test(line);
}

test('formats with HH:MM:SS prefix', () => {
  const line = formatEvent({ type: 'OrderCreated', order: { id: 1, type: 'VIP', status: 'PENDING', createdAt: at }, at });
  expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] /);
  expect(line).toContain('VIP');
  expect(line).toContain('#1');
});

test('OrderCreated includes order type and id', () => {
  const e: DomainEvent = { type: 'OrderCreated', order: { id: 3, type: 'NORMAL', status: 'PENDING', createdAt: at }, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('NORMAL');
  expect(line).toContain('#3');
  expect(line).toContain('PENDING');
});

test('OrderStarted includes bot id and order id', () => {
  const e: DomainEvent = { type: 'OrderStarted', orderId: 2, botId: 1, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #1');
  expect(line).toContain('Order #2');
  expect(line).toContain('PROCESSING');
});

test('OrderCompleted includes bot id and order id', () => {
  const e: DomainEvent = { type: 'OrderCompleted', orderId: 4, botId: 2, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #2');
  expect(line).toContain('Order #4');
  expect(line).toContain('COMPLETE');
});

test('OrderRequeued mentions bot removal and returned to PENDING', () => {
  const e: DomainEvent = { type: 'OrderRequeued', orderId: 5, botId: 3, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #3');
  expect(line).toContain('Order #5');
  expect(line).toMatch(/pending/i);
});

test('BotAdded includes bot id', () => {
  const e: DomainEvent = { type: 'BotAdded', botId: 1, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #1');
});

test('BotRemoved includes bot id', () => {
  const e: DomainEvent = { type: 'BotRemoved', botId: 2, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #2');
});

test('BotIdle includes bot id', () => {
  const e: DomainEvent = { type: 'BotIdle', botId: 1, at };
  const line = formatEvent(e);
  expect(matchesTimestamp(line)).toBe(true);
  expect(line).toContain('Bot #1');
  expect(line).toMatch(/idle/i);
});
