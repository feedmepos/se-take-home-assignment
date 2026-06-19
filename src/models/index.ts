export type CustomerType = "Normal" | "VIP"
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE"
export type BotStatus = "PROCESSING" | "IDLE"

export interface Order {
    id: number;
    customer: CustomerType
    status: OrderStatus
}

export interface Bot {
    id: number
    status: BotStatus
    currentOrderId?: number
}