import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order } from '../../types';

interface OrderState {
  items: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  items: [],
  loading: false,
  error: null,
};

export const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.items = action.payload;
      state.error = null;
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.items.push(action.payload);
      state.error = null;
    },
    updateOrder: (state, action: PayloadAction<Order>) => {
      const index = state.items.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearOrders: (state) => {
      state.items = [];
      state.error = null;
    },
  },
});

export const {
  setOrders,
  addOrder,
  updateOrder,
  setLoading,
  setError,
  clearOrders,
} = orderSlice.actions;

export default orderSlice.reducer;
