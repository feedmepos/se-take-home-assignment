import { useEffect, useReducer } from 'react';
import { Order, OrderType, OrderStatus } from './models/order';
import { Bot, BotStatus } from './models/bot';
import { PROCESSING_TIME_MS } from './constants/timing';
import { Controls } from './components/Controls';
import { OrderSection } from './components/orders/OrderSection';
import { BotCard } from './components/bots/BotCard';

/* =======================
   STATE & TYPES
======================= */

type State = {
  nextOrderId: number;
  nextBotId: number;
  pending: Order[];
  completed: Order[];
  bots: Bot[];
};

type Action =
  | { type: 'CREATE_ORDER'; orderType: OrderType }
  | { type: 'ADD_BOT' }
  | { type: 'BOT_READY'; botId: number }
  | { type: 'START_PROCESSING'; botId: number; order: Order }
  | { type: 'COMPLETE_ORDER'; botId: number; order: Order }
  | { type: 'REMOVE_BOT' };

const initialState: State = {
  nextOrderId: 1,
  nextBotId: 1,
  pending: [],
  completed: [],
  bots: [],
};

/* =======================
   REDUCER (PURE)
======================= */

function orderComparator(a: Order, b: Order) {
  // VIP first
  if (a.type !== b.type) {
    return a.type === OrderType.VIP ? -1 : 1;
  }

  // FIFO within same type
  return a.createdAt.getTime() - b.createdAt.getTime();
}


function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CREATE_ORDER': {
      const order: Order = {
        id: state.nextOrderId,
        type: action.orderType,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      };

      const pending = [...state.pending, order].sort(orderComparator);

      return {
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pending,
      };
    }


    case 'ADD_BOT':
      return {
        ...state,
        nextBotId: state.nextBotId + 1,
        bots: [...state.bots, { id: state.nextBotId, status: BotStatus.INITIALIZING }],
      };

    case 'BOT_READY':
      return {
        ...state,
        bots: state.bots.map(b =>
          b.id === action.botId ? { ...b, status: BotStatus.IDLE } : b,
        ),
      };

    case 'START_PROCESSING':
      return {
        ...state,
        pending: state.pending.slice(1),
        bots: state.bots.map(b =>
          b.id === action.botId
            ? {
              ...b,
              status: BotStatus.PROCESSING,
              currentOrder: action.order,
              processingStartedAt: Date.now(),
            }
            : b,
        ),
      };

    case 'COMPLETE_ORDER':
      return {
        ...state,
        completed: [...state.completed, action.order],
        bots: state.bots.map(b =>
          b.id === action.botId
            ? {
              ...b,
              status: BotStatus.IDLE,
              currentOrder: undefined,
              processingStartedAt: undefined,
            }
            : b,
        ),
      };

    case 'REMOVE_BOT': {
      const bots = [...state.bots];
      const removed = bots.pop();
      if (!removed) return state;

      let pending = state.pending;

      if (removed.currentOrder) {
        const returnedOrder: Order = {
          ...removed.currentOrder,
          status: OrderStatus.PENDING,
          processingAt: undefined,
        };

        pending = [...pending, returnedOrder].sort(orderComparator);
      }

      return { ...state, bots, pending };
    }


  }
}

/* =======================
   COMPONENT
======================= */

export const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  /* -----------------------
     BOT INIT → IDLE
  ----------------------- */
  useEffect(() => {
    const timers = state.bots
      .filter(b => b.status === BotStatus.INITIALIZING)
      .map(bot =>
        setTimeout(() => {
          dispatch({ type: 'BOT_READY', botId: bot.id });
        }, 500),
      );

    return () => timers.forEach(clearTimeout);
  }, [state.bots]);

  /* -----------------------
     SCHEDULER
  ----------------------- */
  useEffect(() => {
    const idleBot = state.bots.find(b => b.status === BotStatus.IDLE);
    if (!idleBot || state.pending.length === 0) return;

    const order: Order = {
      ...state.pending[0],
      status: OrderStatus.PROCESSING,
      processingAt: new Date(),
    };

    dispatch({ type: 'START_PROCESSING', botId: idleBot.id, order });
  }, [state.pending, state.bots]);

  /* -----------------------
     PROCESSING TIMER
  ----------------------- */
  useEffect(() => {
    const timers = state.bots
      .filter(
        b =>
          b.status === BotStatus.PROCESSING &&
          b.currentOrder &&
          b.processingStartedAt,
      )
      .map(bot => {
        const elapsed = Date.now() - bot.processingStartedAt!;
        const remaining = PROCESSING_TIME_MS - elapsed;

        return setTimeout(() => {
          dispatch({
            type: 'COMPLETE_ORDER',
            botId: bot.id,
            order: {
              ...bot.currentOrder!,
              status: OrderStatus.COMPLETE,
              completedAt: new Date(),
            },
          });
        }, remaining);
      });

    return () => timers.forEach(clearTimeout);
  }, [state.bots]);

  /* -----------------------
     UI
  ----------------------- */
  return (
    <div className="app">
      <h1>McDonald Order Controller</h1>

      <Controls
        onCreateOrder={t => dispatch({ type: 'CREATE_ORDER', orderType: t })}
        onAddBot={() => dispatch({ type: 'ADD_BOT' })}
        onRemoveBot={() => dispatch({ type: 'REMOVE_BOT' })}
        disableRemoveBot={!state.bots.length}
      />

      <div className="layout">
        <section className="panel">
          <h2>Pending</h2>
          <OrderSection
            title="VIP"
            orders={state.pending.filter(o => o.type === OrderType.VIP)}
            variant="vip"
            emptyText="No VIP orders"
          />
          <OrderSection
            title="Normal"
            orders={state.pending.filter(o => o.type === OrderType.NORMAL)}
            variant="normal"
            emptyText="No normal orders"
          />
        </section>

        <section className="panel">
          <h2>Completed</h2>
          <OrderSection
            orders={state.completed}
            variant="complete"
            showProcessing
            emptyText="No completed orders"
          />
        </section>

        <section className="panel">
          <h2>Bots</h2>
          <ul>
            {state.bots.map(b => (
              <BotCard key={b.id} bot={b} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
