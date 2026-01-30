import { Order } from './order';

export enum BotStatus {
    IDLE = 'IDLE',
    PROCESSING = 'PROCESSING',
}

export interface Bot {
    id: number;
    status: BotStatus;
    currentOrder?: Order;
    processingStartedAt?: number;
}
