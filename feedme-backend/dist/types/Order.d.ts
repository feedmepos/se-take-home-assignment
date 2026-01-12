export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
export interface IOrder {
    id: number;
    type: OrderType;
    status: OrderStatus;
    createdAt: Date;
}
export declare class Order implements IOrder {
    id: number;
    type: OrderType;
    status: OrderStatus;
    createdAt: Date;
    constructor(id: number, type: OrderType);
    toString(): string;
    toJSON(): IOrder;
}
//# sourceMappingURL=Order.d.ts.map