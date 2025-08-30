<template>
  <Card class="py-1">
    <CardContent class="flex gap-2">
      Order #{{ id }}
      <Badge>{{ type }}</Badge>
      <Badge variant="outline">{{ status }}</Badge>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const { id, type, status } = defineProps(['id', 'type', 'status'])
</script>
