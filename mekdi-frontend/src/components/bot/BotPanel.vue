<script setup lang="ts">
import { BotIndicator } from '@/components/bot'
import { Button, Card } from '@/components/ui'
import { Plus, Minus } from 'lucide-vue-next'
import type { BotEntity } from '@/domains/order'

interface Props {
  bots: BotEntity[]
  idleCount: number
  busyCount: number
}

defineProps<Props>()

const emit = defineEmits<{
  addBot: []
  removeBot: []
}>()
</script>

<template>
  <Card class="p-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-700">Cooking Bots</h3>
        <p class="text-sm text-gray-500">
          {{ bots.length }} total ({{ idleCount }} idle, {{ busyCount }} busy)
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="emit('addBot')">
          <Plus class="w-4 h-4 mr-1" />
          Bot
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="bots.length === 0"
          @click="emit('removeBot')"
        >
          <Minus class="w-4 h-4 mr-1" />
          Bot
        </Button>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <BotIndicator
        v-for="bot in bots"
        :key="bot.id"
        :bot="bot"
      />
      <p v-if="bots.length === 0" class="text-gray-400 text-sm italic">
        No bots available. Add bots to start processing orders.
      </p>
    </div>
  </Card>
</template>
