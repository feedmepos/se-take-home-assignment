import { OrderType } from '@/domain';

/**
 * Every way the controller state can change.
 */
export type ControllerAction =
  | { type: 'CREATE_ORDER'; orderType: OrderType }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'COMPLETE_ORDER'; botId: number; orderId: number };
