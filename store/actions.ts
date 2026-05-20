export type Action =
  | { type: 'ADD_ORDER'; payload: { isVip: boolean } }
  | { type: 'ASSIGN_ORDER'; payload: { botId: number; orderId: number } }
  | { type: 'COMPLETE_ORDER'; payload: { botId: number; orderId: number } }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' };
