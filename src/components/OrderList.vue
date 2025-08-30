<template>
  <Card class="h-100 w-200">
    <CardContent class="grid grid-cols-2 gap-4">
      <div>
        <p class="text-black font-bold">Pending Orders</p>
        <div class="flex flex-col gap-2">
          <OrderItem
            v-for="order in pendingOrders"
            :key="order.id"
            :id="order.id"
            :type="order.type"
            :status="order.status"
          />
        </div>
      </div>
      <div>
        <p class="text-black font-bold">Completed Orders</p>
        <div class="flex flex-col gap-2">
          <OrderItem
            v-for="order in completedOrders"
            :key="order.id"
            :id="order.id"
            :type="order.type"
            :status="order.status"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/order'
import { computed } from 'vue'
import OrderItem from './OrderItem.vue'
import { Card, CardContent } from '@/components/ui/card'

const orderStore = useOrderStore()
const orders = orderStore.orders

const pendingOrders = computed(() =>
  orders
    .filter((order) => order.status !== 'COMPLETED')
    .sort((a, b) => (a.type === 'VIP' && b.type !== 'VIP' ? -1 : 1)),
)
const completedOrders = computed(() => orders.filter((order) => order.status === 'COMPLETED'))
</script>
