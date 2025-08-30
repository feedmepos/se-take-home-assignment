<template>
  <div class="flex flex-col gap-4">
    <button
      @click="orderStore.addOrder('Normal')"
      class="bg-blue-500 hover:bg-blue-600 rounded-md shadow-md text-white p-2"
    >
      Add Normal Order
    </button>
    <button
      @click="orderStore.addOrder('VIP')"
      class="bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-md text-white p-2"
    >
      Add VIP Order
    </button>
    <button
      @click="botStore.addBot"
      class="bg-green-500 hover:bg-green-600 rounded-md shadow-md text-white p-2"
    >
      Add Bot
    </button>
    <button
      :disabled="!bots.length"
      @click="botStore.removeBot"
      class="bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-md shadow-md text-white p-2"
    >
      Remove Bot
    </button>
  </div>
</template>

<script setup lang="ts">
import { useBotStore } from '@/stores/bot'
import { useOrderStore } from '@/stores/order'

const orderStore = useOrderStore()
const botStore = useBotStore()

const bots = botStore.bots
</script>
