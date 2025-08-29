export default interface Order {
  id: number
  type: string
  status: string
  botId?: number
  isVIP: boolean
}
