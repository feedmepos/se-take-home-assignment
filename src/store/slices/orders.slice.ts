import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type OrderType = "VIP" | "NORMAL";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";

export interface Order {
  id: number;
  seq: number; // creation sequence for stable ordering
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
}

export interface Bot {
  id: number;
  currentOrderId: number | null;
}

interface OrdersState {
  orders: Order[];
  bots: Bot[];
  nextId: number;
  nextSeq: number;
  nextBotId: number;
}

const initialState: OrdersState = {
  orders: [],
  bots: [],
  nextId: 1,
  nextSeq: 1,
  nextBotId: 1,
};

const slice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    addOrder(state, action: PayloadAction<{ type: OrderType }>) {
      const o: Order = {
        id: state.nextId++,
        seq: state.nextSeq++,
        type: action.payload.type,
        status: "PENDING",
        createdAt: Date.now(),
      };
      state.orders.push(o);
    },
    addNormalOrder(state) {
      this.addOrder as any; // noop to satisfy TS in reducers listing
    },
    addVIPOrder(state) {
      this.addOrder as any;
    },
    assignOrderToBot(
      state,
      action: PayloadAction<{ botId: number; orderId: number }>,
    ) {
      const { botId, orderId } = action.payload;
      const bot = state.bots.find((b) => b.id === botId);
      const order = state.orders.find((o) => o.id === orderId);
      if (
        bot &&
        order &&
        order.status === "PENDING" &&
        bot.currentOrderId == null
      ) {
        order.status = "PROCESSING";
        bot.currentOrderId = orderId;
      }
    },
    completeOrder(
      state,
      action: PayloadAction<{ botId: number; orderId: number }>,
    ) {
      const { botId, orderId } = action.payload;
      const bot = state.bots.find((b) => b.id === botId);
      const order = state.orders.find((o) => o.id === orderId);
      if (order) order.status = "COMPLETE";
      if (bot && bot.currentOrderId === orderId) bot.currentOrderId = null;
    },
    setOrderPending(state, action: PayloadAction<{ orderId: number }>) {
      const order = state.orders.find((o) => o.id === action.payload.orderId);
      if (order) order.status = "PENDING";
    },
    addBot(state) {
      state.bots.push({ id: state.nextBotId++, currentOrderId: null });
    },
    removeBot(state) {
      const bot = state.bots[state.bots.length - 1];
      if (!bot) return;
      // If bot was processing, return its order to PENDING
      if (bot.currentOrderId != null) {
        const order = state.orders.find((o) => o.id === bot.currentOrderId);
        if (order) order.status = "PENDING";
      }
      state.bots.pop();
    },
    clearBotAssignment(state, action: PayloadAction<{ botId: number }>) {
      const bot = state.bots.find((b) => b.id === action.payload.botId);
      if (bot) bot.currentOrderId = null;
    },
  },
});

// helper thunks-like exported action creators for adding order types
export const {
  addOrder,
  assignOrderToBot,
  completeOrder,
  setOrderPending,
  addBot,
  removeBot,
  clearBotAssignment,
} = slice.actions;

export const addNormal = () => (dispatch: any) =>
  dispatch(addOrder({ type: "NORMAL" }));
export const addVIP = () => (dispatch: any) =>
  dispatch(addOrder({ type: "VIP" }));

export default slice.reducer;
