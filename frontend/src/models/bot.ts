import { Order } from './order';

export enum BotStatus {
    INITIALIZING = 'INITIALIZING',
    READY = 'READY',
    IDLE = 'IDLE',
    PROCESSING = 'PROCESSING',
}

export interface Bot {
    id: number;
    status: BotStatus;
    currentOrder?: Order;
    processingStartedAt?: number;
}
