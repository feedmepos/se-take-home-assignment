import { runCommand } from './dispatcher';
import { OrderController } from '../domain/order-controller';
import { FakeClock } from '../domain/time.fake';

const make = () => {
  const c = new FakeClock();
  return { c, ctrl: new OrderController(c, c) };
};

test('add-order --type vip creates a VIP order; default is normal', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-order --type vip');
  runCommand(ctrl, 'add-order');
  expect(ctrl.listOrders().map((o) => o.type)).toEqual(['VIP', 'NORMAL']);
});

test('del-bot with no bots returns a friendly message, no throw', () => {
  const { ctrl } = make();
  expect(runCommand(ctrl, 'del-bot')).toMatch(/no bot/i);
});

test('add-order returns confirmation with order id and type', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'add-order --type vip');
  expect(out).toMatch(/VIP/);
  expect(out).toMatch(/#1001/);
});

test('add-bot returns confirmation with bot id', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'add-bot');
  expect(out).toMatch(/#1/);
});

test('del-bot removes the newest bot', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-bot');
  runCommand(ctrl, 'add-bot');
  const out = runCommand(ctrl, 'del-bot');
  expect(out).toMatch(/#2/);
});

test('del-bot --id N removes the specified bot', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-bot'); // #1
  runCommand(ctrl, 'add-bot'); // #2
  const out = runCommand(ctrl, 'del-bot --id 1');
  expect(out).toMatch(/#1/);
  expect(ctrl.listBots().map((b) => b.id)).toEqual([2]);
});

test('del-bot with unknown id returns bot-not-found message', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-bot');
  const out = runCommand(ctrl, 'del-bot --id 99');
  expect(out).toMatch(/bot 99 not found/i);
});

test('list-orders returns JSON', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-order --type vip');
  const out = runCommand(ctrl, 'list-orders');
  const parsed = JSON.parse(out) as { type: string }[];
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed[0]!.type).toBe('VIP');
});

test('list-orders --type filters by type', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-order --type vip');
  runCommand(ctrl, 'add-order --type normal');
  const out = runCommand(ctrl, 'list-orders --type vip');
  const parsed = JSON.parse(out) as { type: string }[];
  expect(parsed.every((o) => o.type === 'VIP')).toBe(true);
});

test('list-bots returns JSON', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-bot');
  const out = runCommand(ctrl, 'list-bots');
  const parsed = JSON.parse(out) as unknown[];
  expect(Array.isArray(parsed)).toBe(true);
});

test('status returns JSON snapshot', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'status');
  const parsed = JSON.parse(out) as Record<string, unknown>;
  expect(parsed).toHaveProperty('pending');
  expect(parsed).toHaveProperty('bots');
});

test('help returns usage string', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'help');
  expect(out).toMatch(/add-order/);
  expect(out).toMatch(/add-bot/);
});

test('exit returns __EXIT__', () => {
  const { ctrl } = make();
  expect(runCommand(ctrl, 'exit')).toBe('__EXIT__');
});

test('unknown command returns helpful message', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'foobar');
  expect(out).toMatch(/unknown command/i);
  expect(out).toMatch(/help/i);
});

test('invalid --type returns error string', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'add-order --type invalid');
  expect(out).toMatch(/error/i);
  expect(out).toMatch(/invalid/i);
});

test('add-order accepts type case-insensitively', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-order --type VIP');
  runCommand(ctrl, 'add-order --type Normal');
  expect(ctrl.listOrders().map((o) => o.type)).toEqual(['VIP', 'NORMAL']);
});

test('add-order --type with no value is an error and creates no order', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'add-order --type');
  expect(out).toMatch(/error|invalid/i);
  expect(ctrl.listOrders()).toEqual([]);
});

test('list-orders --type with no value is an error too', () => {
  const { ctrl } = make();
  const out = runCommand(ctrl, 'list-orders --type');
  expect(out).toMatch(/error|invalid/i);
});

test('del-bot --id with non-numeric value returns must-be-a-number and removes no bot', () => {
  const { ctrl } = make();
  runCommand(ctrl, 'add-bot');
  const out = runCommand(ctrl, 'del-bot --id abc');
  expect(out).toMatch(/must be a number/i);
  expect(ctrl.listBots().map((b) => b.id)).toEqual([1]);
});
