<template>
  <Card class="h-125 w-100">
    <CardContent>
      <p class="text-black text-center">Bot List</p>
      <ScrollArea class="h-110 p-4 bg-black rounded-md">
        <div class="flex flex-col gap-2">
          <Card v-for="bot in bots" :key="bot.id" class="py-1 rounded-md">
            <CardContent class="flex gap-2">
              <Bot />
              #{{ bot.id }}
              <Badge>
                {{ bot.status }}
              </Badge>
              <Badge v-if="bot.currentOrderId" variant="outline"
                >Order #{{ bot.currentOrderId }}</Badge
              >
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useBotStore } from '@/stores/bot'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'

const botStore = useBotStore()
const bots = botStore.bots
</script>
