import { describe, expect, it } from 'vitest';
import { BotStatus, OrderType } from '@/domain';
import { ControllerAction } from './actions';
import { controllerReducer } from './reducer';
import { selectComplete, selectPending } from './selectors';
import { initialState, type ControllerState } from './state';

const reduce = (state: ControllerState, ...actions: ControllerAction[]) =>
  actions.reduce(controllerReducer, state);

const newOrder = (orderType: OrderType): ControllerAction => ({
  type: 'CREATE_ORDER',
  orderType,
});

const pendingIds = (state: ControllerState) =>
  selectPending(state).map((o) => o.id);

describe('reducer', () => {
  it('gives orders unique, increasing numbers (requirement 3)', () => {
    const state = reduce(
      initialState,
      newOrder(OrderType.NORMAL),
      newOrder(OrderType.NORMAL),
      newOrder(OrderType.VIP),
    );
    expect(state.orders.map((o) => o.id)).toEqual([1, 2, 3]);
  });

  it('places a VIP in front of Normals but behind existing VIPs (requirement 2)', () => {
    const state = reduce(
      initialState,
      newOrder(OrderType.NORMAL), // #1
      newOrder(OrderType.VIP), // #2
      newOrder(OrderType.NORMAL), // #3
      newOrder(OrderType.VIP), // #4
    );
    expect(pendingIds(state)).toEqual([2, 4, 1, 3]);
  });

  it('a newly added bot immediately picks up the highest-priority order (requirement 4)', () => {
    const state = reduce(
      initialState,
      newOrder(OrderType.NORMAL), // #1
      newOrder(OrderType.VIP), // #2
      { type: 'ADD_BOT' },
    );
    const bot = state.bots[0];
    expect(bot.status).toBe(BotStatus.PROCESSING);
    expect(bot.currentOrderId).toBe(2); // the VIP, not the earlier Normal
    expect(pendingIds(state)).toEqual([1]);
  });

  it('leaves a bot IDLE when there is nothing to cook (requirement 5)', () => {
    const state = reduce(initialState, { type: 'ADD_BOT' });
    expect(state.bots[0].status).toBe(BotStatus.IDLE);
    expect(state.bots[0].currentOrderId).toBeNull();
  });

  it('destroys the newest bot and returns its order to the original slot (requirement 6)', () => {
    const state = reduce(
      initialState,
      newOrder(OrderType.VIP), // #1
      newOrder(OrderType.VIP), // #2
      { type: 'ADD_BOT' }, // bot #1 cooks VIP #1
      { type: 'ADD_BOT' }, // bot #2 cooks VIP #2
      { type: 'REMOVE_BOT' }, // destroys bot #2 -> VIP #2 back to pending
    );
    expect(state.bots).toHaveLength(1);
    expect(state.bots[0].id).toBe(1); // the older bot survived
    expect(state.bots[0].currentOrderId).toBe(1);
    expect(pendingIds(state)).toEqual([2]); // #2 returned, still ahead by id
  });

  it('completes an order, frees the bot, and auto-picks the next one', () => {
    const started = reduce(
      initialState,
      newOrder(OrderType.VIP), // #1
      newOrder(OrderType.NORMAL), // #2
      { type: 'ADD_BOT' }, // bot #1 cooks VIP #1
    );
    const done = controllerReducer(started, {
      type: 'COMPLETE_ORDER',
      botId: 1,
      orderId: 1,
    });

    expect(selectComplete(done).map((o) => o.id)).toEqual([1]);
    expect(done.bots[0].currentOrderId).toBe(2); // moved on to the Normal order
    expect(pendingIds(done)).toEqual([]);
  });

  it('orders the completed list by finish time, not by order id', () => {
    const started = reduce(
      initialState,
      { type: 'ADD_BOT' }, // bot #1
      newOrder(OrderType.NORMAL), // #1 -> bot #1
      { type: 'ADD_BOT' }, // bot #2 (idle)
      newOrder(OrderType.VIP), // #2 -> bot #2
    );
    const done = reduce(
      started,
      { type: 'COMPLETE_ORDER', botId: 2, orderId: 2 }, // #2 finishes first
      { type: 'COMPLETE_ORDER', botId: 1, orderId: 1 }, // #1 finishes second
    );

    expect(selectComplete(done).map((o) => o.id)).toEqual([1, 2]);
  });

  it('ignores a stale COMPLETE_ORDER for an order the bot is no longer cooking', () => {
    const state = reduce(
      initialState,
      newOrder(OrderType.VIP), // #1
      { type: 'ADD_BOT' }, // bot #1 cooks #1
    );
    const unchanged = controllerReducer(state, {
      type: 'COMPLETE_ORDER',
      botId: 1,
      orderId: 999, // wrong order id
    });
    expect(unchanged).toBe(state);
  });

  it('is a no-op when removing a bot with none present', () => {
    expect(controllerReducer(initialState, { type: 'REMOVE_BOT' })).toBe(
      initialState,
    );
  });
});
