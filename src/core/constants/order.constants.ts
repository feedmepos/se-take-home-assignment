import { IEnumMap } from '../models/app.model';

export enum OrderStatus {
    Pending = 1,
    InProgress = 2,
    Complete = 3,
}

export enum OrderTier {
    Normal = 1,
    Vip,
}

export const ORDER_STATUS_MAP: Record<OrderStatus, IEnumMap> = {
    [OrderStatus.Pending]: { name: 'Pending' },
    [OrderStatus.InProgress]: { name: 'In Progress' },
    [OrderStatus.Complete]: { name: 'Complete' },
};
