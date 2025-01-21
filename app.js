// State
const state = {
    orders: [],
    bots: [],
    nextOrderId: 1
};

// DOM Elements
const pendingOrdersEl = document.getElementById('pendingOrders');
const completedOrdersEl = document.getElementById('completedOrders');
const botCountEl = document.getElementById('botCount');

// Event Listeners
document.getElementById('newNormalOrder').addEventListener('click', () => createOrder(false));
document.getElementById('newVipOrder').addEventListener('click', () => createOrder(true));
document.getElementById('addBot').addEventListener('click', addBot);
document.getElementById('removeBot').addEventListener('click', removeBot);

class Order {
    constructor(id, isVip) {
        this.id = id;
        this.isVip = isVip;
        this.status = 'pending';
        this.processingBot = null;
        this.processingTime = isVip ? 5000 : 10000;
        this.startTime = null;
        this.progress = 0;
    }
}

class Bot {
    constructor(id) {
        this.id = id;
        this.currentOrder = null;
        this.status = 'idle';
    }

    async processOrder(order) {
        if (this.status !== 'idle' || order.status !== 'pending') return;
        
        this.status = 'busy';
        this.currentOrder = order;
        order.status = 'processing';
        order.processingBot = this;
        order.startTime = Date.now();
        
        updateUI();

        const updateProgress = () => {
            if (order.status !== 'processing') return;
            const elapsed = Date.now() - order.startTime;
            order.progress = Math.min(100, (elapsed / order.processingTime) * 100);
            updateUI();
        };

        const progressInterval = setInterval(updateProgress, 100);

        try {
            await new Promise(resolve => setTimeout(resolve, order.processingTime));
            if (this.currentOrder === order) {
                completeOrder(order);
                this.currentOrder = null;
                this.status = 'idle';
                processNextOrder();
            }
        } catch (error) {
            console.error('Error processing order:', error);
        } finally {
            clearInterval(progressInterval);
        }
    }
}

function createOrder(isVip) {
    const order = new Order(state.nextOrderId++, isVip);
    
    if (isVip) {
        const botProcessingNormal = state.bots.find(bot => 
            bot.currentOrder && !bot.currentOrder.isVip);
        
        if (botProcessingNormal) {
            const normalOrder = botProcessingNormal.currentOrder;
            normalOrder.status = 'pending';
            normalOrder.processingBot = null;
            normalOrder.progress = 0;
            botProcessingNormal.currentOrder = null;
            botProcessingNormal.status = 'idle';
        }

        const lastVipIndex = state.orders.findLastIndex(o => o.isVip && o.status === 'pending');
        if (lastVipIndex !== -1) {
            state.orders.splice(lastVipIndex + 1, 0, order);
        } else {
            const firstNormalIndex = state.orders.findIndex(o => !o.isVip && o.status === 'pending');
            if (firstNormalIndex !== -1) {
                state.orders.splice(firstNormalIndex, 0, order);
            } else {
                state.orders.push(order);
            }
        }
    } else {
        state.orders.push(order);
    }

    updateUI();
    processNextOrder();
    return order;
}

function addBot() {
    const bot = new Bot(state.bots.length + 1);
    state.bots.push(bot);
    updateUI();
    processNextOrder();
    return bot;
}

function removeBot() {
    if (state.bots.length === 0) return;
    
    const bot = state.bots.pop();
    if (bot.currentOrder) {
        bot.currentOrder.status = 'pending';
        bot.currentOrder.processingBot = null;
        bot.currentOrder.progress = 0;
        updateUI();
    }
    updateUI();
}

function processNextOrder() {
    const availableBot = state.bots.find(bot => bot.status === 'idle');
    if (!availableBot) return;

    let nextOrder = state.orders.find(order => order.status === 'pending' && order.isVip);
    
    if (!nextOrder) {
        nextOrder = state.orders.find(order => order.status === 'pending');
    }

    if (nextOrder) {
        availableBot.processOrder(nextOrder);
    }
}

function completeOrder(order) {
    order.status = 'completed';
    updateUI();
}

function updateUI() {
    pendingOrdersEl.innerHTML = '';
    completedOrdersEl.innerHTML = '';

    state.orders.forEach(order => {
        const orderEl = document.createElement('div');
        orderEl.className = `order-item ${order.isVip ? 'vip' : ''} ${order.status === 'processing' ? 'processing' : ''}`;
        
        let statusText = order.status.toUpperCase();
        if (order.status === 'processing') {
            statusText += ` (${Math.round(order.progress)}%)`;
        }

        orderEl.innerHTML = `
            <span>Order #${order.id} ${order.isVip ? '(VIP)' : ''}</span>
            <span>${statusText}${order.processingBot ? ` - Bot ${order.processingBot.id}` : ''}</span>
            ${order.status === 'processing' ? `
            <div class="progress-bar">
                <div class="progress" style="width: ${order.progress}%"></div>
            </div>` : ''}
        `;

        if (order.status === 'completed') {
            completedOrdersEl.appendChild(orderEl);
        } else {
            pendingOrdersEl.appendChild(orderEl);
        }
    });

    botCountEl.textContent = `Active Bots: ${state.bots.length}`;
}

// Initialize display
updateUI();
