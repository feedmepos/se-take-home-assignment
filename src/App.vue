<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue'
import BotSummaryBar from '@/components/BotSummaryBar.vue'
import CompleteBoard from '@/components/CompleteBoard.vue'
import PendingBoard from '@/components/PendingBoard.vue'
import ProcessingBoard from '@/components/ProcessingBoard.vue'
import { useKitchen } from '@/composables/useKitchen'

const {
  pendingOrders,
  processingOrders,
  botStats,
  completedOrders,
  canRemoveBot,
  addNormalOrder,
  addVipOrder,
  addBot,
  removeBot,
} = useKitchen()
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-mark">M</span>
          <div>
            <h1>Order Controller</h1>
            <p class="subtitle">McDonald's Kitchen Automation</p>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <ActionBar
        :can-remove-bot="canRemoveBot()"
        @add-normal="addNormalOrder()"
        @add-vip="addVipOrder()"
        @add-bot="addBot()"
        @remove-bot="removeBot()"
      />

      <BotSummaryBar :stats="botStats()" />

      <div class="boards">
        <PendingBoard :orders="pendingOrders()" />
        <ProcessingBoard :orders="processingOrders()" />
        <CompleteBoard :orders="completedOrders()" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #da291c 0%, #b91c1c 100%);
  color: #fff;
  box-shadow: var(--shadow-md);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  background: #ffc72c;
  color: #da291c;
  font-weight: 800;
  font-size: 1.25rem;
}

h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subtitle {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  opacity: 0.9;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

.boards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.25rem;
}

@media (max-width: 900px) {
  .boards {
    grid-template-columns: 1fr;
  }
}
</style>
