import { Order } from "src/order/order.types";

export const PROCESSING_TIME_MS = 10000;

export interface Bot {
    id: number;
    currentOrder?: Order;
    isIdle: boolean;
    timer?: NodeJS.Timeout;
}

export interface BotSummary {
    total: number;
    vip: number;
    normal: number;
    completed: number;
    pending: number;
    activeBots: number;
}
