import { Order } from './order'

export type BotState = 'IDLE' | 'BUSY'

export interface Bot {
  id: number
  state: BotState
  // when BUSY:
  current?: {
    order: Order
    timer: NodeJS.Timeout
    startedAt: number
  }
}
