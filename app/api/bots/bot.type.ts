export enum BOT_STATUS {
    WORKING = 'WORKING',
    IDLE = 'IDLE',
}

export interface Bot {
  id: number;
  status: BOT_STATUS
  orderId: string | null
  createdAt: number;
}
  