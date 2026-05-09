<script setup lang="ts">
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { OrderEntity } from '@/domains/order'
import { OrderType, OrderStatus } from '@/domains/order'

interface Props {
  order: OrderEntity
}

defineProps<Props>()
</script>

<template>
  <Card
    :class="cn(
      'p-4 flex items-center justify-between transition-all',
      order.type === OrderType.VIP && 'border-amber-400 bg-amber-50',
      order.status === OrderStatus.PROCESSING && 'ring-2 ring-blue-400 animate-pulse'
    )"
  >
    <div class="flex items-center gap-3">
      <span class="font-semibold text-lg">#{{ order.id }}</span>
      <span
        :class="cn(
          'px-2 py-1 rounded text-xs font-medium',
          order.type === OrderType.VIP
            ? 'bg-amber-200 text-amber-800'
            : 'bg-gray-200 text-gray-800'
        )"
      >
        {{ order.type }}
      </span>
    </div>
    <span
      :class="cn(
        'text-sm font-medium',
        order.status === OrderStatus.PENDING && 'text-yellow-600',
        order.status === OrderStatus.PROCESSING && 'text-blue-600',
        order.status === OrderStatus.COMPLETE && 'text-green-600'
      )"
    >
      {{ order.status }}
    </span>
  </Card>
</template>
