export const ORDER_TYPE = Object.freeze({ NORMAL: 'Normal', VIP: 'VIP', VVIP: 'VVIP' } as const);
export const ORDER_STATUS = Object.freeze({ PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETE: 'COMPLETE' } as const);

export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export class Order {
  readonly id: number;
  readonly type: OrderType;
  status: OrderStatus;

  constructor(id: number, type: OrderType) {
    this.id = id;
    this.type = type;
    this.status = ORDER_STATUS.PENDING;
  }

  get isVIP(): boolean {
    return this.type === ORDER_TYPE.VIP;
  }

  get isVVIP(): boolean {
    return this.type === ORDER_TYPE.VVIP;
  }

  toString(): string {
    return `${this.type} Order #${this.id}`;
  }
}
