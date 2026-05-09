import { OrderQueue } from '../OrderQueue'
import { OrderType, OrderStatus } from '../../types'

describe('OrderQueue', () => {
  let queue: OrderQueue

  beforeEach(() => {
    queue = new OrderQueue()
  })

  describe('createOrder', () => {
    it('should create normal order with auto-incrementing id', () => {
      const order1 = queue.createOrder(OrderType.NORMAL)
      const order2 = queue.createOrder(OrderType.NORMAL)
      
      expect(order1.id).toBe(1)
      expect(order2.id).toBe(2)
    })

    it('should create VIP order with auto-incrementing id', () => {
      const order1 = queue.createOrder(OrderType.VIP)
      const order2 = queue.createOrder(OrderType.VIP)
      
      expect(order1.id).toBe(1)
      expect(order2.id).toBe(2)
    })

    it('should place normal orders at the end', () => {
      queue.createOrder(OrderType.NORMAL)
      queue.createOrder(OrderType.NORMAL)
      
      const pending = queue.getPendingOrders()
      
      expect(pending[0].id).toBe(1)
      expect(pending[1].id).toBe(2)
    })

    it('should place VIP orders before normal orders', () => {
      queue.createOrder(OrderType.NORMAL)
      queue.createOrder(OrderType.VIP)
      
      const pending = queue.getPendingOrders()
      
      expect(pending[0].type).toBe(OrderType.VIP)
      expect(pending[1].type).toBe(OrderType.NORMAL)
    })

    it('should maintain VIP queue order (FIFO for VIPs)', () => {
      queue.createOrder(OrderType.VIP)
      queue.createOrder(OrderType.VIP)
      
      const pending = queue.getPendingOrders()
      
      expect(pending[0].id).toBe(1)
      expect(pending[1].id).toBe(2)
    })

    it('should place new VIP after existing VIPs but before normals', () => {
      queue.createOrder(OrderType.NORMAL)
      queue.createOrder(OrderType.VIP) // VIP #2
      queue.createOrder(OrderType.VIP) // VIP #3
      queue.createOrder(OrderType.NORMAL)
      
      const pending = queue.getPendingOrders()
      
      expect(pending[0].id).toBe(2)
      expect(pending[1].id).toBe(3)
      expect(pending[2].id).toBe(1)
      expect(pending[3].id).toBe(4)
    })
  })

  describe('getPendingOrders', () => {
    it('should return only pending orders', () => {
      const order = queue.createOrder(OrderType.NORMAL)
      queue.markOrderProcessing(order.id)
      queue.createOrder(OrderType.NORMAL)
      
      const pending = queue.getPendingOrders()
      
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe(OrderStatus.PENDING)
    })
  })

  describe('getNextPendingOrder', () => {
    it('should return the first pending order', () => {
      queue.createOrder(OrderType.NORMAL)
      queue.createOrder(OrderType.VIP)
      
      const next = queue.getNextPendingOrder()
      
      expect(next).not.toBeNull()
      expect(next!.type).toBe(OrderType.VIP)
    })

    it('should return null when no pending orders', () => {
      const next = queue.getNextPendingOrder()
      
      expect(next).toBeNull()
    })
  })

  describe('returnOrderToPending', () => {
    it('should return processing order to pending and maintain priority', () => {
      queue.createOrder(OrderType.NORMAL) // Order 1
      queue.createOrder(OrderType.VIP)    // Order 2
      const normal2 = queue.createOrder(OrderType.NORMAL) // Order 3
      
      queue.markOrderProcessing(normal2.id)
      queue.returnOrderToPending(normal2.id)
      
      const pending = queue.getPendingOrders()
      
      expect(pending).toHaveLength(3)
      expect(pending[0].id).toBe(2) // VIP first
      expect(pending[1].id).toBe(1) // Normal 1
      expect(pending[2].id).toBe(3) // Normal 2 (returned)
    })
  })

  describe('completeOrder', () => {
    it('should mark order as complete', () => {
      const order = queue.createOrder(OrderType.NORMAL)
      queue.markOrderProcessing(order.id)
      
      queue.completeOrder(order.id)
      
      expect(order.status).toBe(OrderStatus.COMPLETE)
    })
  })

  describe('findOrderById', () => {
    it('should find order by id', () => {
      const order = queue.createOrder(OrderType.NORMAL)
      
      const found = queue.findOrderById(order.id)
      
      expect(found).toBe(order)
    })

    it('should return undefined for non-existent order', () => {
      const found = queue.findOrderById(999)
      
      expect(found).toBeUndefined()
    })
  })
})
