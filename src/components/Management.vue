<template>
  <div class="flex flex-col gap-4">
    <Button @click="orderStore.addOrder('Normal')">Add Normal Order</Button>
    <Button @click="orderStore.addOrder('VIP')">Add VIP Order</Button>
    <Button @click="botStore.addBot">Add Bot</Button>
    <Button @click="botStore.removeBot" :disabled="!bots.length">Remove Bot</Button>
  </div>
</template>

<script setup lang="ts">
import { useBotStore } from '@/stores/bot'
import { useOrderStore } from '@/stores/order'
import { Button } from '@/components/ui/button'

const orderStore = useOrderStore()
const botStore = useBotStore()

const bots = botStore.bots
</script>
