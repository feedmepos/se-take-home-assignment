// Unit tests for controller.js

const { OrderController } = require('./controller');
const { Order } = require('./order');

describe('OrderController', () => {
    let controller;

    beforeEach(() => {
        controller = new OrderController();
    });

    test('should create orders with increasing ids', () => {
        const order1 = controller.addNormalOrder();
        const order2 = controller.addNormalOrder();
        expect(order1.id).toBe(1);
        expect(order2.id).toBe(2);
    });

    test('VIP orders should be prioritized over normal orders', () => {
        controller.addNormalOrder();
        controller.addNormalOrder();
        controller.addVipOrder();
        
        const status = controller.getStatus();
        const pendingOrders = controller.pendingOrders;
        
        // First order should be VIP
        expect(pendingOrders[0].type).toBe('VIP');
        // Normal orders should come after VIP
        expect(pendingOrders[1].type).toBe('NORMAL');
        expect(pendingOrders[2].type).toBe('NORMAL');
    });

    test('VIP orders should maintain FIFO order among themselves', () => {
        controller.addVipOrder();
        controller.addVipOrder();
        controller.addNormalOrder();
        
        const pendingOrders = controller.pendingOrders;
        expect(pendingOrders[0].id).toBe(1); // First VIP
        expect(pendingOrders[1].id).toBe(2); // Second VIP
        expect(pendingOrders[2].id).toBe(3); // Normal
    });

    test('removeBot should requeue order at front of its type', () => {
        controller.addBot();
        controller.addNormalOrder();
        controller.addNormalOrder();
        controller.addVipOrder();
        
        // Start processing
        controller.processNextOrder();
        
        // Wait a bit for bot to start processing
        return new Promise((resolve) => {
            setTimeout(() => {
                // Bot should be processing first order (VIP)
                expect(controller.bots[0].status).toBe('PROCESSING');
                
                // Remove bot
                controller.removeBot();
                
                // The VIP order should be requeued at front of VIP section
                const pendingOrders = controller.pendingOrders;
                expect(pendingOrders[0].type).toBe('VIP');
                expect(pendingOrders[0].id).toBe(3); // The VIP order that was being processed
                
                resolve();
            }, 100);
        });
    });

    test('requeuePending should place VIP at front of VIP section', () => {
        controller.addVipOrder();
        controller.addVipOrder();
        const newVip = new Order(99, 'VIP');
        controller.requeuePending(newVip);
        
        const pendingOrders = controller.pendingOrders;
        expect(pendingOrders[0].id).toBe(99); // New VIP should be first
        expect(pendingOrders[1].id).toBe(1); // Original first VIP
        expect(pendingOrders[2].id).toBe(2); // Original second VIP
    });

    test('requeuePending should place Normal at start of Normal section', () => {
        controller.addVipOrder();
        controller.addVipOrder();
        controller.addNormalOrder();
        controller.addNormalOrder();
        const newNormal = new Order(99, 'NORMAL');
        controller.requeuePending(newNormal);
        
        const pendingOrders = controller.pendingOrders;
        expect(pendingOrders[0].type).toBe('VIP');
        expect(pendingOrders[1].type).toBe('VIP');
        expect(pendingOrders[2].id).toBe(99); // New Normal should be first Normal
        expect(pendingOrders[3].id).toBe(3); // Original first Normal (id 3 after 2 VIPs)
    });
});

