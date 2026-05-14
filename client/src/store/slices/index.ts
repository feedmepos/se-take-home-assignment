export { default as orderReducer, orderSlice } from './orderSlice';
export {
  setOrders,
  addOrder,
  updateOrder,
  setLoading as setOrderLoading,
  setError as setOrderError,
  clearOrders,
} from './orderSlice';

export { default as botReducer, botSlice } from './botSlice';
export {
  setBots,
  addBot,
  removeBot,
  updateBot,
  setLoading as setBotLoading,
  setError as setBotError,
  clearBots,
} from './botSlice';
