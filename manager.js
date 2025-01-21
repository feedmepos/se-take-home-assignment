// DOM Elements
const activeOrdersEl = document.getElementById('activeOrders');
const recentCompletedOrdersEl = document.getElementById('recentCompletedOrders');
const botCountEl = document.getElementById('botCount');
const botUtilizationEl = document.getElementById('botUtilization');
const pendingCountEl = document.getElementById('pendingCount');
const processingCountEl = document.getElementById('processingCount');
const completedCountEl = document.getElementById('completedCount');
const avgProcessingTimeEl = document.getElementById('avgProcessingTime');

// Event Listeners
document.getElementById('addBot').addEventListener('click', addBot);
document.getElementById('removeBot').addEventListener('click', removeBot);

// Update UI when state changes
window.addEventListener('stateUpdated', (event) => {
    const state = event.detail;
    updateManagerUI(state);
});

function updateManagerUI(state) {
    activeOrdersEl.innerHTML = '';
    recentCompletedOrdersEl.innerHTML = '';

    // Calculate statistics
    const pendingCount = state.orders.filter(o => o.status === 'pending').length;
    const processingCount = state.orders.filter(o => o.status === 'processing').length;
    const completedOrders = state.orders.filter(o => o.status === 'completed');
    const busyBots = state.bots.filter(bot => bot.status === 'busy').length;
    const utilization = state.bots.length ? (busyBots / state.bots.length) * 100 : 0;

    // Calculate average processing time
    const avgProcessingTime = completedOrders.length > 0 ? 
        completedOrders.reduce((sum, order) => {
            const processTime = order.processingTime || 0;
            return sum + processTime;
        }, 0) / completedOrders.length / 1000 : 0;

    // Update statistics
    botCountEl.textContent = `Active Bots: ${state.bots.length}`;
    botUtilizationEl.textContent = `Bot Utilization: ${Math.round(utilization)}%`;
    pendingCountEl.textContent = pendingCount;
    processingCountEl.textContent = processingCount;
    completedCountEl.textContent = completedOrders.length;
    avgProcessingTimeEl.textContent = `${avgProcessingTime.toFixed(1)}s`;

    // Sort and display orders
    const sortedOrders = [...state.orders].sort((a, b) => b.createdAt - a.createdAt);

    sortedOrders.forEach(order => {
        if (order.status === 'completed' && recentCompletedOrdersEl.children.length >= 10) {
            return; // Only show 10 most recent completed orders
        }

        const orderEl = document.createElement('div');
        orderEl.className = `order-item ${order.isVip ? 'vip' : ''} ${order.status === 'processing' ? 'processing' : ''}`;
        
        let statusText = order.status.toUpperCase();
        if (order.status === 'processing') {
            statusText += ` (${Math.round(order.progress)}%)`;
        }

        const waitTime = Math.round((Date.now() - order.createdAt) / 1000);
        
        orderEl.innerHTML = `
            <div class="order-header">
                <span>Order #${order.id} ${order.isVip ? '(VIP)' : ''}</span>
                <span>Wait Time: ${waitTime}s</span>
            </div>
            <div class="order-status">
                <span>${statusText}</span>
                ${order.processingBot ? `<span>Bot ${order.processingBot.id}</span>` : ''}
            </div>
            ${order.status === 'processing' ? `
            <div class="progress-bar">
                <div class="progress" style="width: ${order.progress}%"></div>
            </div>` : ''}
        `;

        if (order.status === 'completed') {
            recentCompletedOrdersEl.appendChild(orderEl);
        } else {
            activeOrdersEl.appendChild(orderEl);
        }
    });

    // Display bot status
    const botsContainer = document.createElement('div');
    botsContainer.className = 'bots-status';
    state.bots.forEach(bot => {
        const botEl = document.createElement('div');
        botEl.className = `bot-status ${bot.status}`;
        botEl.innerHTML = `
            <div class="bot-header">
                <span>Bot #${bot.id}</span>
                <span class="status-badge">${bot.status.toUpperCase()}</span>
            </div>
            ${bot.currentOrder ? `
            <div class="bot-order">
                <span>Processing Order #${bot.currentOrder.id}</span>
                <span>${Math.round(bot.currentOrder.progress)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${bot.currentOrder.progress}%"></div>
            </div>` : ''}
        `;
        botsContainer.appendChild(botEl);
    });
    
    // Insert bots status after bot controls
    const botControls = document.querySelector('.bot-controls');
    const existingBotsStatus = document.querySelector('.bots-status');
    if (existingBotsStatus) {
        existingBotsStatus.replaceWith(botsContainer);
    } else {
        botControls.after(botsContainer);
    }
}

// Initial UI update
updateManagerUI(state);
