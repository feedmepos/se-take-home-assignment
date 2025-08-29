<template>
  <div>
    <h2>Bot List</h2>
    <ul>
      <li v-for="bot in bots" :key="bot.id">Bot #{{ bot.id }} - Status: {{ bot.status }}</li>
    </ul>
  </div>
  <button @click="botStore.addBot">Add Bot</button>
  <button @click="botStore.removeBot">Remove Bot</button>
</template>

<script setup lang="ts">
import { useBotStore } from '@/stores/bot'

const botStore = useBotStore()
const bots = botStore.bots

bots.forEach((bot) => {
  if (bot.status === 'PROCESSING' && bot.currentOrderId) {
    bot.status = `PROCESSING Order #${bot.currentOrderId}`
  }
})
</script>
