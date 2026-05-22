enum OrderStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
}

enum PaymentMethodEnum {
  LBT = 'lbt',
  CARD = 'card',
  CASH = 'cash',
  QR = 'qr',
}

enum PaymentStatusEnum {
  PAID = 'paid',
  PENDING = 'pending',
}

enum MemberTypeEnum {
  NORMAL = 'normal',
  VIP = 'vip'
}

interface IOrder {
  order_id: string,
  customer_id: number;
  restaurant_id: number;
  queue_id: number;
  order_status: OrderStatusEnum,
  total_price: number;
  payment_method: PaymentMethodEnum,
  payment_status: PaymentStatusEnum,
  member_type: MemberTypeEnum,
}

export { OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum, MemberTypeEnum };
export type { IOrder };
