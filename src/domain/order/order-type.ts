/**
 * The two customer tiers a McDonald's order can belong to.
 * VIP members are always served before Normal customers (see orderPriority).
 */
export const OrderType = {
  NORMAL: 'NORMAL',
  VIP: 'VIP',
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];
