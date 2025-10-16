/**
 * McDonald's Order Management System - Mock Backend
 */

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Global state
let orderCounter = 1000;
let botCounter = 0;
const vipOrders = [];      // VIP orders queue
const normalOrders = [];   // Normal orders queue
const completedOrders = [];
const bots = new Map();    // Map<botId, Bot>

// Bot class
class Bot {
    constructor(id) {
        this.id = id;
        this.running = false;
        this.currentOrder = null;
        this.timer = null;
    }

    start() {
        this.running = true;
        this.processNextOrder();
    }

    stop() {
        this.running = false;

        // Clear any pending timer
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // Return current order to pending if any
        if (this.currentOrder !== null) {
            const { orderId, orderType } = this.currentOrder;
            if (orderType === 'VIP') {
                vipOrders.unshift(orderId); // Put back at front
            } else {
                normalOrders.unshift(orderId);
            }
            this.currentOrder = null;
        }
    }

    processNextOrder() {
        if (!this.running) {
            return;
        }

        // Pick up next order
        let orderId = null;
        let orderType = null;

        if (vipOrders.length > 0) {
            orderId = vipOrders.shift();
            orderType = 'VIP';
        } else if (normalOrders.length > 0) {
            orderId = normalOrders.shift();
            orderType = 'NORMAL';
        }

        if (orderId !== null) {
            this.currentOrder = { orderId, orderType };

            // Process order for 10 seconds
            this.timer = setTimeout(() => {
                if (this.running && this.currentOrder !== null) {
                    completedOrders.push(this.currentOrder.orderId);
                    this.currentOrder = null;
                }

                // Try to process next order
                this.processNextOrder();
            }, 10000); // 10 seconds
        } else {
            // No orders available, check again in 500ms
            this.timer = setTimeout(() => {
                this.processNextOrder();
            }, 500);
        }
    }
}

// API Endpoints

// GET /api/dashboard
app.get('/api/dashboard', (req, res) => {
    const pending = [...vipOrders, ...normalOrders];
    const completed = [...completedOrders];

    res.json({
        success: true,
        data: {
            pendingOrders: pending,
            completedOrders: completed
        }
    });
});

// POST /api/orders
app.post('/api/orders', (req, res) => {
    const { type } = req.body;

    if (!type || (type !== 'NORMAL' && type !== 'VIP')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid order type'
        });
    }

    const orderId = orderCounter++;

    // Add to appropriate queue
    if (type === 'VIP') {
        vipOrders.push(orderId);
    } else {
        normalOrders.push(orderId);
    }

    res.json({
        success: true,
        data: {
            id: orderId
        }
    });
});

// GET /api/bots
app.get('/api/bots', (req, res) => {
    const botList = Array.from(bots.keys()).map(id => ({ id }));

    res.json({
        success: true,
        data: botList
    });
});

// POST /api/bots
app.post('/api/bots', (req, res) => {
    const botId = ++botCounter;
    const bot = new Bot(botId);
    bots.set(botId, bot);
    bot.start();

    res.json({
        success: true,
        data: {
            id: botId
        }
    });
});

// DELETE /api/bots/:botId
app.delete('/api/bots/:botId', (req, res) => {
    const botId = parseInt(req.params.botId);

    if (!bots.has(botId)) {
        return res.status(404).json({
            success: false,
            error: 'Bot not found'
        });
    }

    const bot = bots.get(botId);
    bot.stop();
    bots.delete(botId);

    res.json({
        success: true
    });
});

// Start server
const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
