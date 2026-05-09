import { BotEntity } from '../BotEntity'
import { BotStatus } from '../../types'

describe('BotEntity', () => {
  describe('creation', () => {
    it('should create a bot with given id and idle status', () => {
      const bot = new BotEntity(1)
      
      expect(bot.id).toBe(1)
      expect(bot.status).toBe(BotStatus.IDLE)
      expect(bot.currentOrderId).toBeNull()
      expect(bot.processingTimeoutId).toBeNull()
    })
  })

  describe('status checks', () => {
    it('should correctly identify idle bot', () => {
      const bot = new BotEntity(1)
      
      expect(bot.isIdle()).toBe(true)
      expect(bot.isBusy()).toBe(false)
    })

    it('should correctly identify busy bot', () => {
      const bot = new BotEntity(1)
      const timeoutId = setTimeout(() => {}, 1000)
      bot.startProcessing(1, timeoutId)
      
      expect(bot.isIdle()).toBe(false)
      expect(bot.isBusy()).toBe(true)
    })
  })

  describe('startProcessing', () => {
    it('should set bot to busy with order info', () => {
      const bot = new BotEntity(1)
      const timeoutId = setTimeout(() => {}, 1000)
      
      bot.startProcessing(42, timeoutId)
      
      expect(bot.status).toBe(BotStatus.BUSY)
      expect(bot.currentOrderId).toBe(42)
      expect(bot.processingTimeoutId).toBe(timeoutId)
    })
  })

  describe('stopProcessing', () => {
    it('should clear timeout and return to idle', () => {
      const bot = new BotEntity(1)
      const timeoutId = setTimeout(() => {}, 100000)
      bot.startProcessing(42, timeoutId)
      
      const returnedOrderId = bot.stopProcessing()
      
      expect(returnedOrderId).toBe(42)
      expect(bot.status).toBe(BotStatus.IDLE)
      expect(bot.currentOrderId).toBeNull()
      expect(bot.processingTimeoutId).toBeNull()
    })

    it('should return null when not processing', () => {
      const bot = new BotEntity(1)
      
      const returnedOrderId = bot.stopProcessing()
      
      expect(returnedOrderId).toBeNull()
    })
  })

  describe('completeProcessing', () => {
    it('should complete and reset bot state', () => {
      const bot = new BotEntity(1)
      const timeoutId = setTimeout(() => {}, 1000)
      bot.startProcessing(42, timeoutId)
      
      bot.completeProcessing()
      
      expect(bot.status).toBe(BotStatus.IDLE)
      expect(bot.currentOrderId).toBeNull()
      expect(bot.processingTimeoutId).toBeNull()
    })
  })
})
