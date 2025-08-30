<template>
  <li class="text-black">Order #{{ id }} - {{ type }} - {{ status }}</li>
</template>

<script setup lang="ts">
const { id, type, status } = defineProps(['id', 'type', 'status'])
</script>
