export enum ORDER_TYPES {
    NORMAL = 'NORMAL',
    VIP = 'VIP',
}

export enum ORDER_STATUS {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETE = 'COMPLETE'
}

export interface Order {
    id: string;
    type: ORDER_TYPES;
    status: ORDER_STATUS;
    botId?: number | null
    createdAt: number;
    updatedAt?: number | null;
  }

  export interface CreateOrderPayload {
    type: ORDER_TYPES;
  }
  