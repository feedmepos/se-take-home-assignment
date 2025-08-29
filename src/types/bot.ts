export default interface Bot {
  id: number
  status: string
  currentOrderId?: number
  processingTimeout?: number
}
