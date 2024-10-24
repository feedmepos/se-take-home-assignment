import { Injectable, NotFoundException } from '@nestjs/common';
import { Gateway } from 'src/gateway/gateway';
import { OrderService } from 'src/order/order.service';

@Injectable()
export class BotService {
    constructor(private readonly orderService: OrderService, private readonly gateway: Gateway) {}
    
    private bots = [];

    findAll(state?: 'IDLE' | 'WORKING') {
        if (state) {
            const botArray = this.bots.filter(bot => bot.state === state)
            if (botArray.length === 0) throw new NotFoundException('No bots with the requested state')
            return botArray
        }

        return this.bots
    }

    findOne(id: number) {
        const bot = this.bots.find(bot => bot.id === id)
        if (!bot) return null;
        return bot
    }

    async create() {
        const botsByHighestId = [...this.bots].sort((a,b) => b.id - a.id)
        const newId = botsByHighestId.length > 0 ? botsByHighestId[0].id + 1 : 1;
        const newBot = {
            id: newId,
            state: 'IDLE'
        };

        this.bots.push(newBot);
        this.gateway.emitBotListUpdated(this.bots);
        this.processOrders(newBot);
        return newBot;
    }

    async remove(id: number) {
        const botIndex = this.bots.findIndex(bot => bot.id === id);
        if (botIndex === -1) {
            throw new NotFoundException('Bot not found');
        }
        const bot = this.bots[botIndex];
        if (bot.state === 'WORKING' && bot.currentOrder) {
            console.log(`Bot ${bot.id} is processing order ${bot.currentOrder}. Halting and updating order status...`);
            await this.orderService.updateStatus(bot.currentOrder, true);
            console.log(`Waiting for 2 seconds before removing bot ${bot.id}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        this.bots.splice(botIndex, 1);
        this.gateway.emitBotListUpdated(this.bots);
        return { message: `Bot ${id} removed successfully` };
    }

    async processOrders(bot:  {id: number; state: string; currentOrder?: number }) {

        while(true) {
            const botExist = await this.findOne(bot.id);
            if (!botExist) {
                console.log(`Bot ${bot.id} no longer exists. Stopping order processing.`);
                break;
            }
            const order = await this.orderService.getFirstPendingOrder();
            if (order) {
                bot.state = 'WORKING'
                bot.currentOrder = order.id
                await this.orderService.updateStatus(order.id)
                this.gateway.emitOrderProcessing(order.id, bot.id);
                console.log(`Waiting for 10 seconds to update status again for order ${order.id}...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log(`Updating status again for order ${order.id}`);
                await this.orderService.updateStatus(order.id);
            } else {
                bot.state = 'IDLE'
                console.log(`Bot ${bot.id} is idle. Waiting for new orders...`);
                this.gateway.emitBotListUpdated(this.bots)
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
}
