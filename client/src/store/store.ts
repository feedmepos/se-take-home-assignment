import { configureStore } from '@reduxjs/toolkit';
import orderReducer from './slices/orderSlice';
import botReducer from './slices/botSlice';

export const store = configureStore({
  reducer: {
    orders: orderReducer,
    bots: botReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
