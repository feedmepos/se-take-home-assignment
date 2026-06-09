import { configureStore } from "@reduxjs/toolkit";
import exampleReducer from "./slices/example.slice";
import ordersReducer from "./slices/orders.slice";

export const store = configureStore({
  reducer: {
    example: exampleReducer,
    orders: ordersReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
