export enum OrderType {
  VIP = "VIP",
  NORMAL = "NORMAL",
}

export enum OrderStatus {
  PENDING = "PENDING",
  COMPLETE = "COMPLETE",
}

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
}
