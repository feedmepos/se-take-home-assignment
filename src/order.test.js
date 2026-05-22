// Unit tests for order.js

const { Order } = require('./order');

describe('Order', () => {
    test('should create order with correct id and type', () => {
        const order = new Order(1, 'NORMAL');
        expect(order.id).toBe(1);
        expect(order.type).toBe('NORMAL');
        expect(order.status).toBe('PENDING');
    });

    test('should create VIP order', () => {
        const order = new Order(2, 'VIP');
        expect(order.type).toBe('VIP');
    });

    test('toString should return correct format', () => {
        const order = new Order(1, 'NORMAL');
        expect(order.toString()).toBe('Order #1 (NORMAL)');
    });
});

