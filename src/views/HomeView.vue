<script setup lang="ts">
import BotList from '@/components/BotList.vue'
import Controls from '@/components/Controls.vue'
import OrderList from '@/components/OrderList.vue'
</script>

<template>
  <main class="h-screen bg-gray-400 flex flex-col justify-center gap-4">
    <p class="text-black text-center text-lg font-1000">McDonald's Ordering System</p>
    <div class="flex items-center justify-center gap-4">
      <Controls />
      <OrderList />
      <BotList />
    </div>
  </main>
</template>
