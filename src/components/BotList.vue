<template>
  <div class="h-64 border rounded bg-white shadow-md p-4">
    <p class="text-black font-bold">Bot List</p>
    <ul>
      <li v-for="bot in bots" :key="bot.id" class="text-black">
        Bot #{{ bot.id }} - Status:
        {{
          bot.status === 'PROCESSING' ? `${bot.status} Order #${bot.currentOrderId}` : bot.status
        }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useBotStore } from '@/stores/bot'

const botStore = useBotStore()
const bots = botStore.bots
</script>
