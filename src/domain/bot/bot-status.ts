/**
 * A cooking bot is either waiting for work (IDLE) or busy cooking an order
 * (PROCESSING). A bot processes exactly one order at a time.
 */
export const BotStatus = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
} as const;

export type BotStatus = (typeof BotStatus)[keyof typeof BotStatus];
