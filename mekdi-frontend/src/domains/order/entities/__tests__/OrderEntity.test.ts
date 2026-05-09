import { OrderEntity } from '../OrderEntity'
import { OrderType, OrderStatus } from '../../types'

describe('OrderEntity', () => {
  describe('creation', () => {
    it('should create an order with given id and type', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      
      expect(order.id).toBe(1)
      expect(order.type).toBe(OrderType.NORMAL)
      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.createdAt).toBeInstanceOf(Date)
    })

    it('should create VIP order correctly', () => {
      const order = new OrderEntity(2, OrderType.VIP)
      
      expect(order.id).toBe(2)
      expect(order.type).toBe(OrderType.VIP)
      expect(order.status).toBe(OrderStatus.PENDING)
    })
  })

  describe('getPriority', () => {
    it('should return 1 for VIP orders', () => {
      const vipOrder = new OrderEntity(1, OrderType.VIP)
      expect(vipOrder.getPriority()).toBe(1)
    })

    it('should return 2 for NORMAL orders', () => {
      const normalOrder = new OrderEntity(1, OrderType.NORMAL)
      expect(normalOrder.getPriority()).toBe(2)
    })
  })

  describe('status transitions', () => {
    it('should start processing', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      order.startProcessing()
      
      expect(order.status).toBe(OrderStatus.PROCESSING)
    })

    it('should complete order', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      order.startProcessing()
      order.complete()
      
      expect(order.status).toBe(OrderStatus.COMPLETE)
    })

    it('should return to pending', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      order.startProcessing()
      order.returnToPending()
      
      expect(order.status).toBe(OrderStatus.PENDING)
    })
  })

  describe('status checks', () => {
    it('should correctly identify pending orders', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      
      expect(order.isPending()).toBe(true)
      expect(order.isProcessing()).toBe(false)
      expect(order.isComplete()).toBe(false)
    })

    it('should correctly identify processing orders', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      order.startProcessing()
      
      expect(order.isPending()).toBe(false)
      expect(order.isProcessing()).toBe(true)
      expect(order.isComplete()).toBe(false)
    })

    it('should correctly identify complete orders', () => {
      const order = new OrderEntity(1, OrderType.NORMAL)
      order.complete()
      
      expect(order.isPending()).toBe(false)
      expect(order.isProcessing()).toBe(false)
      expect(order.isComplete()).toBe(true)
    })
  })
})
