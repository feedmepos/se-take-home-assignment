<script setup lang="ts">
import BotList from '@/components/BotList.vue'
import Management from '@/components/Management.vue'
import OrderList from '@/components/OrderList.vue'
</script>

<template>
  <main class="min-h-screen max-w-screen bg-gray-500 flex items-center justify-center gap-4 p-4">
    <Management />
    <OrderList />
    <BotList />
  </main>
</template>
