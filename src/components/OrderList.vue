<template>
  <Card class="h-125 w-175">
    <CardContent class="grid grid-cols-2 gap-4">
      <div>
        <p class="text-black text-center">Pending Orders</p>
        <ScrollArea class="h-110 p-4 bg-black rounded-md">
          <div class="flex flex-col gap-2">
            <OrderItem v-for="order in pendingOrders" :order="order" />
          </div>
        </ScrollArea>
      </div>
      <div>
        <p class="text-black text-center">Completed Orders</p>
        <ScrollArea class="h-110 p-4 bg-black rounded-md">
          <div class="flex flex-col gap-2">
            <OrderItem v-for="order in completedOrders" :order="order" />
          </div>
        </ScrollArea>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/order'
import { computed } from 'vue'
import OrderItem from './OrderItem.vue'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

const orderStore = useOrderStore()
const orders = orderStore.orders

const pendingOrders = computed(() =>
  orders
    .filter((order) => order.status !== 'COMPLETED')
    .sort((a, b) => (a.type === 'VIP' && b.type !== 'VIP' ? -1 : 1)),
)
const completedOrders = computed(() => orders.filter((order) => order.status === 'COMPLETED'))
</script>
