import { Order } from '../types/Order.js';
import { Bot } from '../types/Bot.js';
/**
 * OrderController manages the order processing system with bots.
 * Handles order creation, bot management, and order processing with priority queue.
 */
export declare class OrderController {
    private orders;
    private bots;
    private nextOrderId;
    private nextBotId;
    private output;
    constructor();
    /**
     * Formats a date to HH:MM:SS format
     */
    private formatTime;
    /**
     * Logs a message with timestamp to both console and output array
     */
    log(message: string, silent?: boolean): void;
    /**
     * Creates a new normal order and adds it to the queue
     */
    createNormalOrder(): Order;
    /**
     * Creates a new VIP order and inserts it with priority (after VIP, before NORMAL)
     */
    createVIPOrder(): Order;
    /**
     * Adds a new bot to the system and assigns pending orders if available
     */
    addBot(): Bot;
    /**
     * Removes the newest bot from the system.
     * If the bot is processing an order, returns it to PENDING queue.
     */
    removeBot(): Bot | null;
    /**
     * Assigns pending orders to idle bots based on priority
     */
    private assignOrdersToBots;
    /**
     * Processes an order with a bot (10 second delay)
     */
    private processOrder;
    /**
     * Inserts an order into the queue maintaining VIP priority:
     * - VIP orders go after all existing VIP orders, before all NORMAL orders
     * - NORMAL orders go after all VIP orders
     */
    private insertOrderWithPriority;
    /**
     * Gets the current status of the system
     */
    getStatus(): {
        orders: {
            pending: number;
            processing: number;
            complete: number;
            total: number;
        };
        bots: {
            active: number;
            idle: number;
            total: number;
        };
    };
    /**
     * Gets all orders (returns a copy to prevent external modification)
     */
    getAllOrders(): Order[];
    /**
     * Gets all bots (returns a copy to prevent external modification)
     */
    getAllBots(): Bot[];
    /**
     * Gets all log output as a single string
     */
    getOutput(): string;
    /**
     * Resets the controller (useful for testing)
     */
    reset(): void;
}
//# sourceMappingURL=OrderController.d.ts.map