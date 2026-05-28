import { OrderStatus, OrderTier } from '../constants/order.constants';

export interface IOrderRequest {
    name: string;
    tier: OrderTier;
    status: OrderStatus;
    botId?: number;
}

export interface IOrderResponse extends IOrderRequest {
    id: number;
}
