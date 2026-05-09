<script setup lang="ts">
import { OrderCard } from '@/components/order'
import type { OrderEntity } from '@/domains/order'

interface Props {
  orders: OrderEntity[]
  title: string
  emptyMessage: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <h3 class="text-lg font-semibold text-gray-700">{{ title }}</h3>
    <div v-if="orders.length === 0" class="text-gray-400 text-sm italic">
      {{ emptyMessage }}
    </div>
    <div v-else class="flex flex-col gap-2">
      <OrderCard
        v-for="order in orders"
        :key="order.id"
        :order="order"
      />
    </div>
  </div>
</template>
