import { Injectable, Logger, Controller } from '@nestjs/common';
import { OrderType } from '../domain/orders/order.entity';
import { OrderService } from '../services/order.service';
import { BotService } from '../services/bot.service';
import * as fs from 'fs';

@Controller()
@Injectable()
export class CliController {
  private readonly logger = new Logger(CliController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly botService: BotService,
  ) {}

  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }

  private log(message: string): void {
    const timestamp = this.formatTime(new Date());
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    try {
      // Append to result.txt with error handling
      fs.appendFileSync('scripts/result.txt', logMessage + '\n');
    } catch (error) {
      this.logger.error(`Failed to write to result.txt: ${error.message}`);
    }
  }

  createNormalOrder(): void {
    try {
      const order = this.orderService.createOrder(OrderType.NORMAL);
      this.log(`New Normal Order #${order.id} created and added to PENDING area`);
      
      // Try to process with available bots
      this.botService.processPendingOrders();
    } catch (error) {
      this.logger.error(`Failed to create normal order: ${error.message}`);
      this.log(`ERROR: Failed to create normal order - ${error.message}`);
    }
  }

  createVipOrder(): void {
    try {
      const order = this.orderService.createOrder(OrderType.VIP);
      this.log(`New VIP Order #${order.id} created and added to PENDING area (priority queue)`);
      
      // Try to process with available bots
      this.botService.processPendingOrders();
    } catch (error) {
      this.logger.error(`Failed to create VIP order: ${error.message}`);
      this.log(`ERROR: Failed to create VIP order - ${error.message}`);
    }
  }

  addBot(): void {
    try {
      const bot = this.botService.addBot();
      this.log(`Bot #${bot.id} added and started processing orders`);
    } catch (error) {
      this.logger.error(`Failed to add bot: ${error.message}`);
      this.log(`ERROR: Failed to add bot - ${error.message}`);
    }
  }

  removeBot(): void {
    try {
      const removed = this.botService.removeBot();
      if (removed) {
        this.log(`Bot removed (newest bot destroyed)`);
      } else {
        this.log(`No bots available to remove`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove bot: ${error.message}`);
      this.log(`ERROR: Failed to remove bot - ${error.message}`);
    }
  }

  getStatus(): void {
    const orderStats = this.orderService.getOrderStats();
    const botStats = this.botService.getBotStats();
    
    this.log(`=== SYSTEM STATUS ===`);
    this.log(`Orders: ${orderStats.total} total, ${orderStats.pending} pending, ${orderStats.processing} processing, ${orderStats.complete} complete`);
    this.log(`Bots: ${botStats.total} total, ${botStats.idle} idle, ${botStats.processing} processing`);
    
    // Show pending orders
    const pendingOrders = this.orderService.getPendingOrders();
    if (pendingOrders.length > 0) {
      this.log(`Pending Orders: ${pendingOrders.map(o => `#${o.id}(${o.type})`).join(', ')}`);
    }
    
    // Show processing orders
    const processingOrders = this.orderService.getProcessingOrders();
    if (processingOrders.length > 0) {
      this.log(`Processing Orders: ${processingOrders.map(o => `#${o.id}(${o.type})`).join(', ')}`);
    }
    
    // Show completed orders
    const completedOrders = this.orderService.getCompletedOrders();
    if (completedOrders.length > 0) {
      this.log(`Completed Orders: ${completedOrders.map(o => `#${o.id}(${o.type})`).join(', ')}`);
    }
  }

  // Simulate the complete workflow as described in requirements
  runSimulation(): void {
    this.log('=== MCDONALD\'S ORDER SYSTEM SIMULATION ===');
    this.log('Starting simulation...');
    
    // Step 1: Create some normal orders
    this.log('\n--- Step 1: Creating Normal Orders ---');
    this.createNormalOrder();
    this.createNormalOrder();
    this.createNormalOrder();
    
    // Step 2: Add a bot to start processing
    this.log('\n--- Step 2: Adding Bot ---');
    this.addBot();
    
    // Step 3: Create VIP order (should jump to front of queue)
    this.log('\n--- Step 3: Creating VIP Order (Priority) ---');
    this.createVipOrder();
    
    // Step 4: Add another bot
    this.log('\n--- Step 4: Adding Another Bot ---');
    this.addBot();
    
    // Step 5: Create more orders
    this.log('\n--- Step 5: Creating More Orders ---');
    this.createNormalOrder();
    this.createVipOrder();
    
    // Step 6: Show status
    this.log('\n--- Step 6: Current Status ---');
    this.getStatus();
    
    // Step 7: Remove a bot
    this.log('\n--- Step 7: Removing Bot ---');
    this.removeBot();
    
    // Step 8: Final status
    this.log('\n--- Step 8: Final Status ---');
    this.getStatus();
    
    this.log('\n=== SIMULATION COMPLETE ===');
    this.log('Note: Orders will continue processing in background for 10 seconds each');
  }

  // Edge case testing methods
  runEdgeCaseTests(): void {
    this.log('\n=== EDGE CASE TESTING ===');
    
    // Test 1: System integrity validation
    this.log('\n--- Test 1: System Integrity Validation ---');
    const orderIntegrity = this.orderService.validateSystemIntegrity();
    const botIntegrity = this.botService.validateSystemIntegrity();
    
    this.log(`Order system integrity: ${orderIntegrity.isValid ? 'VALID' : 'INVALID'}`);
    if (!orderIntegrity.isValid) {
      orderIntegrity.issues.forEach(issue => this.log(`  - ${issue}`));
    }
    
    this.log(`Bot system integrity: ${botIntegrity.isValid ? 'VALID' : 'INVALID'}`);
    if (!botIntegrity.isValid) {
      botIntegrity.issues.forEach(issue => this.log(`  - ${issue}`));
    }

    // Test 2: Invalid order type handling
    this.log('\n--- Test 2: Invalid Order Type Handling ---');
    try {
      // @ts-ignore - Intentionally passing invalid type for testing
      // @ts-ignore
      this.orderService.createOrder('INVALID_TYPE');
    } catch (error) {
      this.log(`✓ Correctly handled invalid order type: ${error.message}`);
    }

    // Test 3: Bot limit testing
    this.log('\n--- Test 3: Bot Limit Testing ---');
    try {
      // Add many bots to test limit
      for (let i = 0; i < 5; i++) {
        this.botService.addBot();
      }
      this.log('✓ Successfully added multiple bots');
    } catch (error) {
      this.log(`✓ Correctly handled bot limit: ${error.message}`);
    }

    // Test 4: Cleanup orphaned timeouts
    this.log('\n--- Test 4: Orphaned Timeout Cleanup ---');
    const cleanedTimeouts = this.botService.cleanupOrphanedTimeouts();
    this.log(`Cleaned up ${cleanedTimeouts} orphaned timeouts`);

    // Test 5: Stuck order recovery
    this.log('\n--- Test 5: Stuck Order Recovery ---');
    const resetOrders = this.orderService.resetStuckOrders();
    this.log(`Reset ${resetOrders} stuck orders`);

    this.log('\n=== EDGE CASE TESTING COMPLETE ===');
  }

  // Graceful shutdown with cleanup
  gracefulShutdown(): void {
    this.log('\n=== GRACEFUL SHUTDOWN ===');
    this.log('Cleaning up resources...');
    
    try {
      // Cleanup bot service
      this.botService.cleanup();
      this.log('✓ Bot service cleaned up');
      
      // Final system integrity check
      const orderIntegrity = this.orderService.validateSystemIntegrity();
      const botIntegrity = this.botService.validateSystemIntegrity();
      
      if (!orderIntegrity.isValid || !botIntegrity.isValid) {
        this.log('⚠️  System integrity issues detected during shutdown');
      } else {
        this.log('✓ System integrity verified');
      }
      
      this.log('Shutdown complete');
    } catch (error) {
      this.logger.error(`Error during shutdown: ${error.message}`);
      this.log(`ERROR during shutdown: ${error.message}`);
    }
  }
}
