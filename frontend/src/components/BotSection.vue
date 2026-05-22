<script setup>
defineProps({
  bots: {
    type: Array,
    required: true
  }
})
</script>

<template>
  <div class="bot-section">
    <h2>Active Bots ({{ bots.length }})</h2>
    <div class="bot-grid">
      <div 
        v-for="bot in bots" 
        :key="bot.id" 
        class="bot-card"
        :class="{ 'processing': bot.status === 'PROCESSING' }"
      >
        <div class="bot-icon">🤖</div>
        <div class="bot-info">
          <span class="bot-id">Bot #{{ bot.id }}</span>
          <span class="bot-status">{{ bot.status }}</span>
          <span v-if="bot.current_order_id" class="bot-order">
            Processing Order #{{ bot.current_order_id }}
          </span>
        </div>
      </div>
      <div v-if="bots.length === 0" class="empty-state">
        No bots active. Add a bot to start cooking!
      </div>
    </div>
  </div>
</template>

<style scoped>
.bot-section {
  background: var(--surface-card);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.bot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.bot-card {
  background: var(--surface-elevated);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
}

.bot-card.processing {
  border-color: var(--primary-color);
  background: rgba(var(--primary-rgb), 0.1);
}

.bot-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.bot-status {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.processing .bot-status {
  color: var(--primary-color);
}

.bot-order {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 0.25rem;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-tertiary);
  padding: 2rem;
}
</style>
