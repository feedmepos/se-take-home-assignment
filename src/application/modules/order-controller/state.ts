import { Bot, Order } from '@/domain';

export interface ControllerState {
  readonly orders: readonly Order[];
  readonly bots: readonly Bot[];
  readonly nextOrderId: number;
  readonly nextBotId: number;
  
  readonly nextCompletionSeq: number;
}

const START_ORDER_ID = 1;
const START_BOT_ID = 1;
const START_COMPLETION_SEQ = 1;
export const ORDER_PROCESS_MS = 10_000;

export const initialState: ControllerState = {
  orders: [],
  bots: [],
  nextOrderId: START_ORDER_ID,
  nextBotId: START_BOT_ID,
  nextCompletionSeq: START_COMPLETION_SEQ,
};
