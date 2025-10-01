export type OrderType = 'VIP' | 'NORMAL'

export interface Order {
  id: number // unique, strictly increasing
  type: OrderType
  createdAt: number // ms epoch (used for tie-breaks if needed)
}
