import { BotStatus } from './bot-status';

/**
 * A cooking bot. `id` is unique and increasing; the newest bot (highest id) is
 * the one destroyed when a manager clicks "- Bot".
 */
export interface Bot {
  readonly id: number;
  readonly status: BotStatus;
  /** Id of the order currently being cooked, or null when IDLE. */
  readonly currentOrderId: number | null;
}

export function createBot(id: number): Bot {
  return { id, status: BotStatus.IDLE, currentOrderId: null };
}
