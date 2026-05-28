<template>
  <div
    class="order-card"
    :class="[`type-${order.type.toLowerCase()}`, `status-${order.status.toLowerCase()}`]"
  >
    <div class="order-top">
      <span class="order-id">#{{ order.id }}</span>
      <span class="order-badge" :class="order.type.toLowerCase()">{{ order.type }}</span>
    </div>
    <div v-if="order.status === 'PROCESSING'" class="processing-row">
      <span class="spinner" />
      <span class="processing-label">Processing…</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { Order } from '../types'

export default defineComponent({
  name: 'OrderCard',
  props: {
    order: {
      type: Object as PropType<Order>,
      required: true
    }
  }
})
</script>

<style scoped>
.order-card {
  padding: 0.6rem 0.875rem;
  border-radius: 10px;
  border: 1.5px solid #e8e4dc;
  background: #fafaf8;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  transition: border-color 0.2s;
}

.order-card.status-processing {
  border-color: #ffc72c;
  background: #fffdf0;
}

.order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-id {
  font-size: 0.9rem;
  font-weight: 700;
}

.order-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
}
.order-badge.normal { background: #f0ede7; color: #666; }
.order-badge.vip    { background: #27251f; color: #ffc72c; }

.processing-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.processing-label {
  font-size: 0.75rem;
  color: #b08800;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ffc72c;
  border-top-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
</style>
