// Unit tests for bot.js

const { Bot } = require('./bot');
const { Order } = require('./order');

describe('Bot', () => {
    test('should create bot with IDLE status', () => {
        const bot = new Bot(1);
        expect(bot.id).toBe(1);
        expect(bot.status).toBe('IDLE');
        expect(bot.currentOrder).toBeNull();
    });

    test('stopProcessing should return order and reset status', () => {
        const bot = new Bot(1);
        const order = new Order(1, 'NORMAL');
        bot.currentOrder = order;
        bot.status = 'PROCESSING';
        
        const returnedOrder = bot.stopProcessing();
        expect(returnedOrder).toBe(order);
        expect(returnedOrder.status).toBe('PENDING');
        expect(bot.status).toBe('IDLE');
        expect(bot.currentOrder).toBeNull();
    });
});

