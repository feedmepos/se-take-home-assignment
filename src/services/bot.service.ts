import { Injectable, Logger, Inject } from '@nestjs/common';
import { Bot, BotStatus } from '../domain/bots/bot.entity';
import { BotRepository } from '../domain/bots/bot.repository';
import { OrderService } from './order.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private processingTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private readonly maxBots = 100; // Prevent resource exhaustion

  constructor(
    private readonly orderService: OrderService,
    @Inject('BotRepository') private readonly botRepo: BotRepository,
  ) {}

  addBot(): Bot {
    // Edge case: Prevent resource exhaustion
    if (this.botRepo.findAll().length >= this.maxBots) {
      throw new Error(`Maximum bot limit reached (${this.maxBots}). Cannot add more bots.`);
    }

    const bot = new Bot(this.botRepo.nextId());
    this.botRepo.save(bot);
    this.logger.log(`Added bot #${bot.id}`);
    
    // Immediately try to process an order if available
    this.tryProcessNextOrder(bot);
    
    return bot;
  }

  removeBot(): boolean {
    if (this.botRepo.findAll().length === 0) {
      this.logger.warn('No bots available to remove');
      return false;
    }

    // Remove the newest bot (last in array)
    const botToRemove = this.botRepo.findAll()[this.botRepo.findAll().length - 1];
    this.logger.log(`Removing bot #${botToRemove.id}`);
    
    // If bot is processing an order, stop it and return order to pending
    if (botToRemove.status === BotStatus.PROCESSING && botToRemove.currentOrderId) {
      this.logger.log(`Bot #${botToRemove.id} was processing order #${botToRemove.currentOrderId}, returning order to pending`);
      this.stopBotProcessing(botToRemove.id);
    }
    
    // Clean up any remaining timeout for this bot
    const timeout = this.processingTimeouts.get(botToRemove.id);
    if (timeout) {
      clearTimeout(timeout);
      this.processingTimeouts.delete(botToRemove.id);
      this.logger.log(`Cleaned up timeout for removed bot #${botToRemove.id}`);
    }
    
    this.botRepo.removeLatest();
    return true;
  }

  getAllBots(): Bot[] {
    return this.botRepo.findAll();
  }

  getIdleBots(): Bot[] {
    return this.botRepo.getByStatus(BotStatus.IDLE);
  }

  getProcessingBots(): Bot[] {
    return this.botRepo.getByStatus(BotStatus.PROCESSING);
  }

  getBotById(id: number): Bot | undefined {
    return this.botRepo.findById(id);
  }

  private tryProcessNextOrder(bot: Bot): void {
    // Edge case: Validate bot state
    if (bot.status !== BotStatus.IDLE) {
      this.logger.warn(`Bot #${bot.id} is not idle, cannot process orders. Current status: ${bot.status}`);
      return;
    }

    const nextOrder = this.orderService.getNextOrderToProcess();
    if (!nextOrder) {
      this.logger.log(`Bot #${bot.id} is idle - no orders to process`);
      return; // No orders to process
    }

    // Edge case: Check if order is already being processed by another bot
    const isOrderAlreadyProcessing = this.orderService.getProcessingOrders()
      .some(order => order.id === nextOrder.id);
    
    if (isOrderAlreadyProcessing) {
      this.logger.warn(`Order #${nextOrder.id} is already being processed by another bot`);
      return;
    }

    // Start processing the order
    const success = this.orderService.startProcessingOrder(nextOrder.id);
    if (!success) {
      this.logger.error(`Failed to start processing order #${nextOrder.id}`);
      return;
    }

    bot.startProcessing(nextOrder.id);
    this.botRepo.update(bot);
    this.logger.log(`Bot #${bot.id} started processing order #${nextOrder.id}`);

    // Set timeout for 10 seconds to complete the order
    const timeout = setTimeout(() => {
      this.completeOrderProcessing(bot.id, nextOrder.id);
    }, 10000);

    this.processingTimeouts.set(bot.id, timeout);
  }

  private completeOrderProcessing(botId: number, orderId: number): void {
    const bot = this.getBotById(botId);
    if (!bot) {
      this.logger.error(`Bot #${botId} not found during order completion`);
      return;
    }

    // Edge case: Validate bot is actually processing this order
    if (bot.currentOrderId !== orderId) {
      this.logger.error(`Bot #${botId} is not processing order #${orderId}. Current order: ${bot.currentOrderId}`);
      return;
    }

    // Complete the order
    const success = this.orderService.completeOrder(orderId);
    if (!success) {
      this.logger.error(`Failed to complete order #${orderId}`);
      return;
    }
    
    this.logger.log(`Bot #${botId} completed order #${orderId}`);
    
    // Reset bot to idle
    bot.stopProcessing();
    
    // Clear timeout
    const timeout = this.processingTimeouts.get(botId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingTimeouts.delete(botId);
    }

    // Try to process next order
    this.tryProcessNextOrder(bot);
  }

  private stopBotProcessing(botId: number): void {
    const bot = this.getBotById(botId);
    if (!bot || bot.status !== BotStatus.PROCESSING || !bot.currentOrderId) {
      this.logger.warn(`Cannot stop processing for bot #${botId} - invalid state`);
      return;
    }

    // Return order to pending
    const success = this.orderService.resetOrderToPending(bot.currentOrderId);
    if (!success) {
      this.logger.error(`Failed to reset order #${bot.currentOrderId} to pending`);
    }
    
    // Stop bot
    bot.stopProcessing();
    this.botRepo.update(bot);
    this.logger.log(`Stopped bot #${botId} processing`);
    
    // Clear timeout
    const timeout = this.processingTimeouts.get(botId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingTimeouts.delete(botId);
    }
  }

  // Method to manually trigger order processing for idle bots
  processPendingOrders(): void {
    const idleBots = this.getIdleBots();
    idleBots.forEach(bot => {
      this.tryProcessNextOrder(bot);
    });
  }

  getBotStats(): { total: number; idle: number; processing: number } {
    return {
      total: this.botRepo.findAll().length,
      idle: this.getIdleBots().length,
      processing: this.getProcessingBots().length
    };
  }

  // Edge case: Cleanup all timeouts (for graceful shutdown)
  cleanup(): void {
    this.logger.log('Cleaning up bot service...');
    
    // First clean up orphaned timeouts
    const orphanedCount = this.cleanupOrphanedTimeouts();
    
    // Then clear all remaining timeouts
    this.processingTimeouts.forEach((timeout, botId) => {
      clearTimeout(timeout);
      this.logger.log(`Cleared timeout for bot #${botId}`);
    });
    this.processingTimeouts.clear();
    
    this.logger.log(`Bot service cleanup completed. Cleaned ${orphanedCount} orphaned timeouts.`);
  }

  // Edge case: Validate system integrity
  validateSystemIntegrity(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for duplicate bot IDs
    const botIds = this.botRepo.findAll().map(b => b.id);
    const uniqueIds = new Set(botIds);
    if (botIds.length !== uniqueIds.size) {
      issues.push('Duplicate bot IDs found');
    }
    
    // Check for bots with invalid status
    const invalidBots = this.botRepo.findAll().filter(bot => 
      !Object.values(BotStatus).includes(bot.status)
    );
    if (invalidBots.length > 0) {
      issues.push(`${invalidBots.length} bots with invalid status`);
    }
    
    // Check for bots processing non-existent orders
    const botsWithInvalidOrders = this.botRepo.findAll().filter(bot => {
      if (bot.status === BotStatus.PROCESSING && bot.currentOrderId) {
        const order = this.orderService.getOrderById(bot.currentOrderId);
        return !order || order.status !== 'PROCESSING';
      }
      return false;
    });
    
    if (botsWithInvalidOrders.length > 0) {
      issues.push(`${botsWithInvalidOrders.length} bots processing invalid orders`);
    }
    
    // Check for orphaned timeouts
    const orphanedTimeouts = Array.from(this.processingTimeouts.keys())
      .filter(botId => !this.getBotById(botId));
    
    if (orphanedTimeouts.length > 0) {
      issues.push(`${orphanedTimeouts.length} orphaned timeouts found`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Edge case: Emergency cleanup of orphaned timeouts
  cleanupOrphanedTimeouts(): number {
    let cleanedCount = 0;
    
    // Clean up timeouts for bots that no longer exist
    const orphanedTimeouts = Array.from(this.processingTimeouts.keys())
      .filter(botId => !this.getBotById(botId));
    
    orphanedTimeouts.forEach(botId => {
      const timeout = this.processingTimeouts.get(botId);
      if (timeout) {
        clearTimeout(timeout);
        this.processingTimeouts.delete(botId);
        this.logger.warn(`Cleaned up orphaned timeout for non-existent bot #${botId}`);
        cleanedCount++;
      }
    });
    
    // Clean up timeouts for bots that are idle but have timeouts
    const allBots = this.botRepo.findAll();
    allBots.forEach(bot => {
      if (bot.status === BotStatus.IDLE && this.processingTimeouts.has(bot.id)) {
        const timeout = this.processingTimeouts.get(bot.id);
        if (timeout) {
          clearTimeout(timeout);
          this.processingTimeouts.delete(bot.id);
          this.logger.warn(`Cleaned up orphaned timeout for idle bot #${bot.id}`);
          cleanedCount++;
        }
      }
    });
    
    // Clean up timeouts for bots processing non-existent orders
    allBots.forEach(bot => {
      if (bot.status === BotStatus.PROCESSING && bot.currentOrderId) {
        const order = this.orderService.getOrderById(bot.currentOrderId);
        if (!order) {
          const timeout = this.processingTimeouts.get(bot.id);
          if (timeout) {
            clearTimeout(timeout);
            this.processingTimeouts.delete(bot.id);
            this.logger.warn(`Cleaned up orphaned timeout for bot #${bot.id} processing non-existent order #${bot.currentOrderId}`);
            cleanedCount++;
          }
          // Reset bot to idle since order doesn't exist
          bot.stopProcessing();
        }
      }
    });
    
    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} orphaned timeouts`);
    }
    
    return cleanedCount;
  }

  // Edge case: Force reset all processing bots
  forceResetAllBots(): number {
    const processingBots = this.getProcessingBots();
    
    processingBots.forEach(bot => {
      if (bot.currentOrderId) {
        this.stopBotProcessing(bot.id);
        this.logger.warn(`Force reset bot #${bot.id}`);
      }
    });
    
    return processingBots.length;
  }
}
