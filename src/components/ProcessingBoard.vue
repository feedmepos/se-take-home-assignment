<script setup lang="ts">
import { ROLE_LABEL } from '@/domain/constants'
import type { ProcessingOrderView } from '@/domain/types'

defineProps<{
  orders: ProcessingOrderView[]
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <span class="panel-dot" style="background: var(--color-processing)" />
      <h2>Processing</h2>
      <span v-if="orders.length" class="count">{{ orders.length }}</span>
    </div>
    <div class="panel-body">
      <ul v-if="orders.length" class="panel-list">
        <li v-for="order in orders" :key="order.id" class="item">
          <div class="item-top">
            <span class="order-id">#{{ order.id }}</span>
            <span class="role-badge" :class="order.role">{{ ROLE_LABEL[order.role] }}</span>
            <span class="bot-tag">Bot #{{ order.botId }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="panel-empty">No orders being processed</p>
    </div>
  </section>
</template>

<style scoped>
.count {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  background: #eff6ff;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.item {
  padding: 0.75rem 0.5rem;
  border-radius: 8px;
}

.item + .item {
  border-top: 1px solid #f3f4f6;
}

.item-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bot-tag {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  background: #f3f4f6;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}
</style>
