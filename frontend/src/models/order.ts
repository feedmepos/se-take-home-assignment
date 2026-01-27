export enum OrderType {
    VIP = 'VIP',
    NORMAL = 'NORMAL',
}

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETE = 'COMPLETE',
}

export interface Order {
    id: number;
    type: OrderType;
    status: OrderStatus;
    createdAt: Date;
    processingAt?: Date;
    completedAt?: Date;
}
