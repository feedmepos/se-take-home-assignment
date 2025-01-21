// DOM Elements
const pendingOrdersEl = document.getElementById('pendingOrders');
const completedOrdersEl = document.getElementById('completedOrders');
const botCountEl = document.getElementById('botCount');
const orderCountEl = document.getElementById('orderCount');

// Event Listeners
document.getElementById('newNormalOrder').addEventListener('click', () => createOrder(false));
document.getElementById('newVipOrder').addEventListener('click', () => createOrder(true));

// Update UI when state changes
window.addEventListener('stateUpdated', (event) => {
    const state = event.detail;
    updateCustomerUI(state);
});

function updateCustomerUI(state) {
    pendingOrdersEl.innerHTML = '';
    completedOrdersEl.innerHTML = '';

    // Sort orders to show most recent first
    const sortedOrders = [...state.orders].sort((a, b) => b.createdAt - a.createdAt);

    sortedOrders.forEach(order => {
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
            completedOrdersEl.appendChild(orderEl);
        } else {
            pendingOrdersEl.appendChild(orderEl);
        }
    });

    // Update status bar
    botCountEl.textContent = `Active Bots: ${state.bots.length}`;
    const pendingCount = state.orders.filter(o => o.status === 'pending').length;
    orderCountEl.textContent = `Orders in Queue: ${pendingCount}`;
}

// Initial UI update
updateCustomerUI(state);
