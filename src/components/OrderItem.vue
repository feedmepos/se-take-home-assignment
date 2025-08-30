<template>
  <Card class="py-1 rounded-md">
    <CardContent class="flex gap-2">
      <ListTodo />
      #{{ props.order.id }}
      <Badge>{{ props.order.type }}</Badge>
      <Badge variant="outline">{{ props.order.status }}</Badge>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListTodo } from 'lucide-vue-next'
import type Order from '@/types/order'

const props = defineProps<{ order: Order }>()
</script>
