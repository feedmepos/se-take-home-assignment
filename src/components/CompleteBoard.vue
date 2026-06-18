<script setup lang="ts">
import { ROLE_LABEL } from '@/domain/constants'
import type { Order } from '@/domain/types'

defineProps<{
  orders: Order[]
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <span class="panel-dot" style="background: var(--color-complete)" />
      <h2>Complete</h2>
      <span v-if="orders.length" class="count">{{ orders.length }}</span>
    </div>
    <div class="panel-body">
      <ul v-if="orders.length" class="panel-list">
        <li v-for="order in orders" :key="order.id" class="item">
          <div class="item-main">
            <span class="order-id">#{{ order.id }}</span>
            <span class="role-badge" :class="order.role">{{ ROLE_LABEL[order.role] }}</span>
          </div>
          <span v-if="order.completedAt" class="time">{{ order.completedAt }}</span>
        </li>
      </ul>
      <p v-else class="panel-empty">No completed orders yet</p>
    </div>
  </section>
</template>

<style scoped>
.count {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  background: #ecfdf5;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.5rem;
  border-radius: 8px;
}

.item + .item {
  border-top: 1px solid #f3f4f6;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.time {
  font-variant-numeric: tabular-nums;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-complete);
  background: #ecfdf5;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}
</style>
