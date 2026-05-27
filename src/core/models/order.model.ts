import { OrderStatus, OrderTier } from '../constants/order.constants';

export interface IOderRequest {
    name: string;
    tier: OrderTier;
    status: OrderStatus;
}

export interface IOrderResponse extends IOderRequest {
    id: number;
}
