<script setup>
defineProps({
  title: String,
  orders: Array,
  type: {
    type: String,
    default: 'pending' // pending or complete
  }
})
</script>

<template>
  <div class="order-section">
    <h2>{{ title }} ({{ orders.length }})</h2>
    <div class="order-list" :class="type">
      <transition-group name="list">
        <div 
          v-for="order in orders" 
          :key="order.id" 
          class="order-card"
          :class="{ 'vip': order.type === 'VIP' }"
        >
          <div class="order-header">
            <span class="order-id">#{{ order.id }}</span>
            <span v-if="order.type === 'VIP'" class="vip-badge">VIP</span>
          </div>
          <div class="order-status">
            {{ order.status }}
          </div>
        </div>
      </transition-group>
      <div v-if="orders.length === 0" class="empty-state">
        No orders here.
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-section {
  background: var(--surface-card);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.order-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 1rem;
  padding-right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.order-card {
  background: var(--surface-elevated);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid var(--text-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.order-card.vip {
  border-left-color: var(--vip-color);
  background: linear-gradient(to right, rgba(var(--vip-rgb), 0.1), transparent);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.vip-badge {
  background: var(--vip-color);
  color: white;
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  margin-left: 0.5rem;
  font-weight: bold;
}

.order-id {
  font-weight: bold;
  font-size: 1.1rem;
}

.order-status {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  color: var(--text-tertiary);
  padding: 2rem;
}
</style>
