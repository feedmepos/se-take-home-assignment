<script setup lang="ts">
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Bot, Loader2 } from 'lucide-vue-next'
import type { BotEntity } from '@/domains/order'

interface Props {
  bot: BotEntity
}

defineProps<Props>()
</script>

<template>
  <div
    :class="cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      bot.status === 'IDLE'
        ? 'bg-gray-100 border-gray-200'
        : 'bg-blue-50 border-blue-200'
    )"
  >
    <Bot :class="cn('w-5 h-5', bot.status === 'BUSY' && 'text-blue-600')" />
    <span class="text-sm font-medium">Bot {{ bot.id }}</span>
    <Badge
      :variant="bot.status === 'IDLE' ? 'secondary' : 'default'"
      :class="cn('text-xs', bot.status === 'BUSY' && 'bg-blue-500')"
    >
      <Loader2 v-if="bot.status === 'BUSY'" class="w-3 h-3 mr-1 animate-spin" />
      {{ bot.status }}
    </Badge>
    <span v-if="bot.currentOrderId" class="text-xs text-gray-500">
      Order #{{ bot.currentOrderId }}
    </span>
  </div>
</template>
