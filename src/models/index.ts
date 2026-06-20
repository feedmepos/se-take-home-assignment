import blessed from "blessed";

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

export interface DashboardLayout {
    screen: blessed.Widgets.Screen;
    header: blessed.Widgets.BoxElement;
    ordersBox: blessed.Widgets.BoxElement;
    botsBox: blessed.Widgets.BoxElement;
    logBox: blessed.Widgets.Log;
}