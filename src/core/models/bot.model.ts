export enum BotStatus {
    Idle = 1,
    Processing,
}

export interface IBotResponse {
    id: number;
    status: BotStatus;
    orderId?: number;
    timerId?: ReturnType<typeof setTimeout>;
}
