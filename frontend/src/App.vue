<script setup>
import { useOrderSystem } from './composables/useOrderSystem'
import ControlPanel from './components/ControlPanel.vue'
import OrderList from './components/OrderList.vue'
import BotSection from './components/BotSection.vue'

const { 
  orders, 
  bots, 
  pendingOrders, 
  completeOrders, 
  error,
  addOrder, 
  addBot, 
  removeBot 
} = useOrderSystem()
</script>

<template>
  <header>
    <h1>McDonald's Bot Manager</h1>
  </header>
  
  <main>
    <div v-if="error" class="error-banner">
      Error: {{ error }}. Is the backend running?
    </div>

    <ControlPanel 
      @add-normal="addOrder('NORMAL')"
      @add-vip="addOrder('VIP')"
      @add-bot="addBot"
      @remove-bot="removeBot"
    />

    <div class="dashboard-grid">
      <div class="col pending">
        <OrderList 
          title="Pending Orders" 
          :orders="pendingOrders" 
          type="pending" 
        />
      </div>
      
      <div class="col center">
        <BotSection :bots="bots" />
      </div>

      <div class="col complete">
        <OrderList 
          title="Completed Orders" 
          :orders="completeOrders" 
          type="complete" 
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 1.5rem;
  height: 60vh;
}

.col {
  height: 100%;
}

.error-banner {
  background: var(--danger-color);
  color: white;
  padding: 1rem;
  margin-bottom: 2rem;
  border-radius: 8px;
  text-align: center;
  font-weight: bold;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .col {
    height: 500px;
  }
}
</style>
