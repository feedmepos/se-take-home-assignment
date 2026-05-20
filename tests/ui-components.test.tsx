import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppContext } from '../context/AppContext';
import { BotCard } from '../components/BotCard';
import { BotList } from '../components/BotList';
import { ControlPanel } from '../components/ControlPanel';
import { OrderCard } from '../components/OrderCard';
import { OrderQueue } from '../components/OrderQueue';
import type { AppState, Bot, Order } from '../types';

function renderWithState(element: React.ReactElement, state: AppState): string {
  return renderToStaticMarkup(
    <AppContext.Provider
      value={{
        state,
        dispatch: () => undefined,
        removeNewestBot: () => undefined,
      }}
    >
      {element}
    </AppContext.Provider>,
  );
}

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    orders: [],
    bots: [],
    orderCounter: 0,
    botCounter: 0,
    ...overrides,
  };
}

function getButtonOpeningTag(markup: string, ariaLabel: string): string {
  return markup.match(new RegExp(`<button[^>]*aria-label="${ariaLabel}"[^>]*>`))?.[0] ?? '';
}

test('ControlPanel renders all actions and disables remove when there are no bots', () => {
  const markup = renderWithState(<ControlPanel />, createState());

  assert.ok(markup.includes('New Normal Order'));
  assert.ok(markup.includes('New VIP Order'));
  assert.ok(markup.includes('+ Bot'));
  assert.ok(markup.includes('- Bot'));

  const removeButton = getButtonOpeningTag(markup, 'Remove the newest bot');
  assert.match(removeButton, /\sdisabled(?:="")?(?=\s|>)/);
});

test('ControlPanel enables bot removal when bots exist', () => {
  const markup = renderWithState(
    <ControlPanel />,
    createState({
      bots: [{ id: 1, status: 'idle', currentOrderId: null }],
      botCounter: 1,
    }),
  );

  const removeButton = getButtonOpeningTag(markup, 'Remove the newest bot');
  assert.ok(!/\sdisabled(?:="")?(?=\s|>)/.test(removeButton));
});

test('ControlPanel throws when rendered outside the provider', () => {
  assert.throws(() => renderToStaticMarkup(<ControlPanel />), /useAppContext/);
});

test('BotList renders bot cards and empty state', () => {
  const populatedMarkup = renderWithState(
    <BotList />,
    createState({
      bots: [
        { id: 1, status: 'idle', currentOrderId: null },
        { id: 2, status: 'processing', currentOrderId: 7 },
      ],
      orders: [{ id: 7, type: 'vip', status: 'processing', createdAt: 123 }],
      botCounter: 2,
      orderCounter: 7,
    }),
  );

  assert.ok(populatedMarkup.includes('Bot #1'));
  assert.ok(populatedMarkup.includes('Bot #2'));
  assert.ok(populatedMarkup.includes('2 total'));
  assert.ok(populatedMarkup.includes('PROCESSING Order #7'));

  const emptyMarkup = renderWithState(<BotList />, createState());
  assert.ok(emptyMarkup.includes('No bots are active yet.'));
});

test('BotList throws when rendered outside the provider', () => {
  assert.throws(() => renderToStaticMarkup(<BotList />), /useAppContext/);
});

test('BotCard renders idle and processing states', () => {
  const idleBot: Bot = { id: 3, status: 'idle', currentOrderId: null };
  const idleMarkup = renderWithState(<BotCard bot={idleBot} />, createState({ bots: [idleBot] }));

  assert.ok(idleMarkup.includes('Bot #3'));
  assert.ok(idleMarkup.includes('IDLE'));
  assert.ok(idleMarkup.includes('Waiting for the next pending order.'));

  const processingBot: Bot = { id: 4, status: 'processing', currentOrderId: 11 };
  const processingMarkup = renderWithState(
    <BotCard bot={processingBot} />,
    createState({
      bots: [processingBot],
      orders: [{ id: 11, type: 'normal', status: 'processing', createdAt: 456 }],
    }),
  );

  assert.ok(processingMarkup.includes('PROCESSING Order #11'));
  assert.ok(processingMarkup.includes('Current order'));
  assert.ok(processingMarkup.includes('bot-progress'));
});

test('BotCard throws when rendered outside the provider', () => {
  const bot: Bot = { id: 1, status: 'idle', currentOrderId: null };
  assert.throws(() => renderToStaticMarkup(<BotCard bot={bot} />), /useAppContext/);
});

test('OrderQueue renders pending and completed orders with counts', () => {
  const pendingOrder: Order = { id: 1, type: 'vip', status: 'pending', createdAt: 1 };
  const completedOrder: Order = { id: 2, type: 'normal', status: 'complete', createdAt: 2 };

  const markup = renderWithState(
    <OrderQueue />,
    createState({
      orders: [pendingOrder, completedOrder],
      bots: [],
      orderCounter: 2,
    }),
  );

  assert.ok(markup.includes('PENDING (1)'));
  assert.ok(markup.includes('COMPLETE (1)'));
  assert.ok(markup.includes('Order #1'));
  assert.ok(markup.includes('Order #2'));
});

test('OrderQueue renders empty states when there are no orders', () => {
  const markup = renderWithState(<OrderQueue />, createState());

  assert.ok(markup.includes('No pending orders right now.'));
  assert.ok(markup.includes('Completed orders will appear here.'));
});

test('OrderQueue throws when rendered outside the provider', () => {
  assert.throws(() => renderToStaticMarkup(<OrderQueue />), /useAppContext/);
});

test('OrderCard renders type badges and processing progress', () => {
  const vipProcessingOrder: Order = {
    id: 8,
    type: 'vip',
    status: 'processing',
    createdAt: 8,
  };
  const pendingMarkup = renderToStaticMarkup(<OrderCard order={vipProcessingOrder} />);

  assert.ok(pendingMarkup.includes('Order #8'));
  assert.ok(pendingMarkup.includes('⭐ VIP'));
  assert.ok(pendingMarkup.includes('Processing'));
  assert.ok(pendingMarkup.includes('order-progress'));

  const normalCompleteOrder: Order = {
    id: 9,
    type: 'normal',
    status: 'complete',
    createdAt: 9,
  };
  const completeMarkup = renderToStaticMarkup(<OrderCard order={normalCompleteOrder} />);

  assert.ok(completeMarkup.includes('📋 Normal'));
  assert.ok(completeMarkup.includes('Completed and ready.'));
});
