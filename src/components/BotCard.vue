<template>
  <div class="bot-card" :class="bot.status.toLowerCase()">
    <span class="bot-icon">🤖</span>
    <div class="bot-info">
      <span class="bot-name">Bot #{{ bot.id }}</span>
      <span class="bot-status">{{ bot.status }}</span>
      <span v-if="order" class="bot-order">→ Order #{{ order.id }}</span>
    </div>
    <span v-if="bot.status === 'PROCESSING'" class="spinner" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { Bot, Order } from '../types'

export default defineComponent({
  name: 'BotCard',
  props: {
    bot: {
      type: Object as PropType<Bot>,
      required: true
    },
    order: {
      type: Object as PropType<Order>,
      default: undefined
    }
  }
})
</script>

<style scoped>
.bot-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1.5px solid #e8e4dc;
  background: #fafaf8;
  min-width: 140px;
  transition: border-color 0.2s, background 0.2s;
}

.bot-card.processing {
  border-color: #da291c;
  background: #fff8f8;
}

.bot-icon { font-size: 1.25rem; line-height: 1; }

.bot-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
}

.bot-name  { font-size: 0.8rem; font-weight: 700; }
.bot-status {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #aaa;
}
.bot-card.processing .bot-status { color: #da291c; }
.bot-order { font-size: 0.7rem; color: #888; }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #da291c;
  border-top-color: transparent;
  border-radius: 50%;
  flex-shrink: 0;
  animation: spin 0.7s linear infinite;
}
</style>
