<template>
  <div class="h-64 border rounded bg-white shadow-md grid grid-cols-2 gap-4 p-4">
    <div>
      <p class="text-black font-bold">Pending Orders</p>
      <ul v-for="order in pendingOrders" :key="order.id">
        <OrderItem :id="order.id" :type="order.type" :status="order.status" />
      </ul>
    </div>
    <div>
      <p class="text-black font-bold">Completed Orders</p>
      <ul v-for="order in completedOrders" :key="order.id">
        <OrderItem :id="order.id" :type="order.type" :status="order.status" />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/order'
import { computed } from 'vue'
import OrderItem from './OrderItem.vue'

const orderStore = useOrderStore()
const orders = orderStore.orders

const pendingOrders = computed(() =>
  orders
    .filter((order) => order.status !== 'COMPLETED')
    .sort((a, b) => (a.type === 'VIP' && b.type !== 'VIP' ? -1 : 1)),
)
const completedOrders = computed(() => orders.filter((order) => order.status === 'COMPLETED'))
</script>
