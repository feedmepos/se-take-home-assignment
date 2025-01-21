// Class definitions
class Order {
    constructor(id, isVip) {
        this.id = id;
        this.isVip = isVip;
        this.status = 'pending';
        this.processingBot = null;
        this.processingTime = 10000; // 10 seconds for all orders
        this.startTime = null;
        this.progress = 0;
        this.createdAt = Date.now();
    }
}

class Bot {
    constructor(id) {
        this.id = id;
        this.currentOrder = null;
        this.status = 'idle';
        this.progressInterval = null;
    }

    processOrder(order) {
        if (this.status !== 'idle' || order.status !== 'pending') return;
        
        // Clear any existing interval
        this.stopInterval();

        // Start processing
        this.status = 'busy';
        this.currentOrder = order;
        order.status = 'processing';
        order.processingBot = this;
        order.startTime = Date.now();
        order.progress = 0;
        
        // Create new interval
        this.startInterval();
        saveState();
    }

    startInterval() {
        if (this.progressInterval) return;

        this.progressInterval = setInterval(() => {
            if (!this.currentOrder || this.status !== 'busy') {
                this.stopInterval();
                return;
            }

            const elapsed = Date.now() - this.currentOrder.startTime;
            this.currentOrder.progress = Math.min(100, (elapsed / this.currentOrder.processingTime) * 100);

            if (this.currentOrder.progress >= 100) {
                this.stopInterval();
                this.currentOrder.status = 'completed';
                this.currentOrder = null;
                this.status = 'idle';
                saveState();
                processNextOrder();
            } else {
                saveState();
            }
        }, 100);
    }

    stopInterval() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    stopProcessing() {
        this.stopInterval();
        if (this.currentOrder) {
            this.currentOrder.status = 'pending';
            this.currentOrder.processingBot = null;
            this.currentOrder.progress = 0;
            this.currentOrder.startTime = null;
            this.currentOrder = null;
        }
        this.status = 'idle';
    }
}

// Shared state management
let state = {
    orders: [],
    bots: [],
    nextOrderId: 1
};

function serializeState() {
    return {
        orders: state.orders.map(order => ({
            id: order.id,
            isVip: order.isVip,
            status: order.status,
            progress: order.progress,
            startTime: order.startTime,
            processingBotId: order.processingBot ? order.processingBot.id : null
        })),
        bots: state.bots.map(bot => ({
            id: bot.id,
            status: bot.status,
            currentOrderId: bot.currentOrder ? bot.currentOrder.id : null
        })),
        nextOrderId: state.nextOrderId
    };
}

function saveState() {
    const serializedState = serializeState();
    localStorage.setItem('mcdonaldsState', JSON.stringify(serializedState));
    window.dispatchEvent(new CustomEvent('stateUpdated', { detail: state }));
}

function createOrder(isVip) {
    const order = new Order(state.nextOrderId++, isVip);
    
    if (isVip) {
        // First, check if there's a bot processing a normal order
        const botProcessingNormal = state.bots.find(bot => 
            bot.status === 'busy' && 
            bot.currentOrder && 
            !bot.currentOrder.isVip
        );
        
        // Interrupt normal order if found
        if (botProcessingNormal) {
            if (botProcessingNormal.progressInterval) {
                clearInterval(botProcessingNormal.progressInterval);
                botProcessingNormal.progressInterval = null;
            }
            const normalOrder = botProcessingNormal.currentOrder;
            normalOrder.status = 'pending';
            normalOrder.processingBot = null;
            normalOrder.progress = 0;
            normalOrder.startTime = null;
            botProcessingNormal.currentOrder = null;
            botProcessingNormal.status = 'idle';
        }

        // Insert VIP order in proper position
        const lastVipIndex = state.orders.findLastIndex(o => 
            o.isVip && 
            (o.status === 'pending' || o.status === 'processing')
        );
        
        if (lastVipIndex !== -1) {
            // Place after last VIP order
            state.orders.splice(lastVipIndex + 1, 0, order);
        } else {
            // Place before first normal order
            const firstNormalIndex = state.orders.findIndex(o => 
                !o.isVip && 
                (o.status === 'pending' || o.status === 'processing')
            );
            if (firstNormalIndex !== -1) {
                state.orders.splice(firstNormalIndex, 0, order);
            } else {
                state.orders.push(order);
            }
        }
    } else {
        state.orders.push(order);
    }

    saveState();
    processNextOrder();
    return order;
}

function addBot() {
    const bot = new Bot(state.bots.length + 1);
    state.bots.push(bot);
    saveState();
    processNextOrder();
    return bot;
}

function removeBot() {
    if (state.bots.length === 0) return;
    
    const bot = state.bots.pop();
    bot.stopProcessing();
    saveState();
    processNextOrder();
}

function processNextOrder() {
    const availableBot = state.bots.find(bot => bot.status === 'idle');
    if (!availableBot) return;

    // First try to find a pending VIP order
    let nextOrder = state.orders.find(order => 
        order.status === 'pending' && 
        order.isVip
    );
    
    // If no VIP orders, get the first pending normal order
    if (!nextOrder) {
        nextOrder = state.orders.find(order => 
            order.status === 'pending'
        );
    }

    if (nextOrder) {
        availableBot.processOrder(nextOrder);
    }
}

// Listen for storage events from other windows
window.addEventListener('storage', (event) => {
    if (event.key === 'mcdonaldsState') {
        const newState = JSON.parse(event.newValue);
        
        // Reconstruct objects with their methods
        newState.orders = newState.orders.map(o => {
            const order = new Order(o.id, o.isVip);
            order.status = o.status;
            order.progress = o.progress;
            order.startTime = o.startTime;
            return order;
        });
        
        // Keep track of currently processing bots
        const processingBots = state.bots.filter(bot => 
            bot.status === 'busy' && 
            bot.currentOrder && 
            bot.progressInterval
        );
        
        newState.bots = newState.bots.map(b => {
            const bot = new Bot(b.id);
            bot.status = b.status;
            if (b.currentOrderId) {
                bot.currentOrder = newState.orders.find(o => o.id === b.currentOrderId);
                if (bot.currentOrder) {
                    bot.currentOrder.processingBot = bot;
                }
            }
            return bot;
        });
        
        state = newState;

        // Restore processing for bots that were processing
        processingBots.forEach(oldBot => {
            const newBot = state.bots.find(b => b.id === oldBot.id);
            if (newBot && newBot.status === 'busy' && newBot.currentOrder) {
                newBot.startInterval();
            }
        });
        
        window.dispatchEvent(new CustomEvent('stateUpdated', { detail: state }));
    }
});
