<template>
  <div>
    <h2>Pending Orders</h2>
    <ul>
      <li v-for="order in pendingOrders" :key="order.id">
        <OrderItem :id="order.id" :type="order.type" :status="order.status" />
      </li>
    </ul>
    <h2>Completed Orders</h2>
    <ul>
      <li v-for="order in completedOrders" :key="order.id">
        <OrderItem :id="order.id" :type="order.type" :status="order.status" />
      </li>
    </ul>
    <button @click="orderStore.addOrder('Normal')">Add Normal Order</button>
    <button @click="orderStore.addOrder('VIP')">Add VIP Order</button>
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
