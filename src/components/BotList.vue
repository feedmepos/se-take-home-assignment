<template>
  <Card class="h-100 w-50">
    <CardContent>
      <p class="text-black font-bold">Bot List</p>
      <ul>
        <li v-for="bot in bots" :key="bot.id" class="text-black">
          Bot #{{ bot.id }} - Status:
          {{
            bot.status === 'PROCESSING' ? `${bot.status} Order #${bot.currentOrderId}` : bot.status
          }}
        </li>
      </ul>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useBotStore } from '@/stores/bot'
import { Card, CardContent } from './ui/card'

const botStore = useBotStore()
const bots = botStore.bots
</script>
