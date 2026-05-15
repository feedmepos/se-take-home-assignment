export interface Order {
    id: string
    status: "PENDING" | "COMPLETE"
    isVip: boolean
}