import type { Order } from "../order/order.js"

export interface Bot {
    id: string
    status: "IDLE" | "BUSY"
    assignedOrder?: Order
    orderCompletionJobId?: NodeJS.Timeout
}