<template>
  <div>
    <h2>Pending Orders</h2>
    <ul>
      <li v-for="order in pendingOrders" :key="order.id">
        Order #{{ order.id }} - {{ order.type }} - ${{ order.status }}
      </li>
    </ul>
    <h2>Completed Orders</h2>
    <ul>
      <li v-for="order in completedOrders" :key="order.id">
        Order #{{ order.id }} - {{ order.type }} - ${{ order.status }}
      </li>
    </ul>
    <button @click="orderStore.addNormalOrder">Add Normal Order</button>
    <button @click="orderStore.addVIPOrder">Add VIP Order</button>
  </div>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/order'
import { computed } from 'vue'

const orderStore = useOrderStore()
const orders = orderStore.orders

const pendingOrders = computed(() => orders.filter((order) => order.status !== 'COMPLETED'))
const completedOrders = computed(() => orders.filter((order) => order.status === 'COMPLETED'))
</script>
