import { Injectable, signal } from '@angular/core';
import { Order } from '../interfaces/order.interface';
import { Bot } from '../interfaces/bot.interface';
import { BotStatus } from '../enums/bot-status.enum';
import { OrderType } from '../enums/order-type.enum';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  pendingOrders = signal<Order[]>([]);
  bots = signal<Bot[]>([]);
  completeOrders = signal<Order[]>([]);
  
  private orderIdCounter = 1;
  private botIdCounter = 1;
  private tickInterval: any;

  constructor() {
    this.startTick();
  }

  startTick() {
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  stopTick() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  addOrder(type: OrderType) {
    const order: Order = { id: this.orderIdCounter++, type, status: OrderStatus.PENDING, createdAt: new Date() };
    this.pendingOrders.update(orders => {
      const newOrders = [...orders, order];
      return newOrders.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === OrderType.VIP ? -1 : 1;
        }
        return a.id - b.id;
      });
    });
    this.assignBots();
  }

  addBot() {
    const newBot: Bot = {
      id: this.botIdCounter++,
      status: BotStatus.IDLE,
      processingOrder: null,
      timeLeft: 0
    };
    this.bots.update(bots => [...bots, newBot]);
    this.assignBots();
  }

  removeBot() {
    this.bots.update(bots => {
      if (bots.length === 0) return bots;
      const copy = [...bots];
      const removedBot = copy.pop()!;
      
      if (removedBot.status === BotStatus.PROCESSING && removedBot.processingOrder) {
        this.pendingOrders.update(orders => {
          const pendingOrder = { ...removedBot.processingOrder!, status: OrderStatus.PENDING };
          const newOrders = [...orders, pendingOrder];
          return newOrders.sort((a, b) => {
            if (a.type !== b.type) return a.type === OrderType.VIP ? -1 : 1;
            return a.id - b.id;
          });
        });
      }
      return copy;
    });
    this.assignBots();
  }

  private tick() {
    let statusChanged = false;

    this.bots.update(bots => {
      return bots.map(bot => {
        if (bot.status === BotStatus.PROCESSING) {
          if (bot.timeLeft <= 1) {
            if (bot.processingOrder) {
               const completedOrder = { ...bot.processingOrder!, status: OrderStatus.COMPLETED, completedAt: new Date() };
               this.completeOrders.update(c => [...c, completedOrder].sort((a, b) => b.id - a.id)); 
            }
            statusChanged = true;
            return {
              ...bot,
              status: BotStatus.IDLE,
              processingOrder: null,
              timeLeft: 0
            } as Bot;
          } else {
            return {
              ...bot,
              timeLeft: bot.timeLeft - 1
            };
          }
        }
        return bot;
      });
    });

    if (statusChanged) {
      this.assignBots();
    }
  }

  private assignBots() {
    this.bots.update(bots => {
      const pending = [...this.pendingOrders()];
      let hasUpdates = false;
      
      const newBots = bots.map(bot => {
        if (bot.status === BotStatus.IDLE && pending.length > 0) {
          const order = pending.shift()!;
          const processingOrder = { ...order, status: OrderStatus.PROCESSING };
          hasUpdates = true;
          return {
            ...bot,
            status: BotStatus.PROCESSING,
            processingOrder: processingOrder,
            timeLeft: 10
          } as Bot;
        }
        return bot;
      });

      if (hasUpdates) {
        this.pendingOrders.set(pending);
      }
      return newBots;
    });
  }
}
