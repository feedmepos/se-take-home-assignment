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
      <span class="panel-dot" style="background: var(--color-pending)" />
      <h2>Pending</h2>
      <span v-if="orders.length" class="count">{{ orders.length }}</span>
    </div>
    <div class="panel-body">
      <ul v-if="orders.length" class="panel-list">
        <li v-for="(order, index) in orders" :key="order.id" class="item">
          <span class="queue-num">{{ index + 1 }}</span>
          <div class="item-main">
            <span class="order-id">#{{ order.id }}</span>
            <span class="role-badge" :class="order.role">{{ ROLE_LABEL[order.role] }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="panel-empty">No orders waiting</p>
    </div>
  </section>
</template>

<style scoped>
.count {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.5rem;
  border-radius: 8px;
  transition: background 0.15s;
}

.item:hover {
  background: #f9fafb;
}

.item + .item {
  border-top: 1px solid #f3f4f6;
}

.queue-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  background: #fff7ed;
  color: var(--color-pending);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
