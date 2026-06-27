<script setup lang="ts">
defineEmits<{
  addNormal: []
  addVip: []
  addBot: []
  removeBot: []
}>()

defineProps<{
  canRemoveBot: boolean
}>()
</script>

<template>
  <section class="action-bar">
    <button type="button" class="btn btn-normal" @click="$emit('addNormal')">
      New Normal Order
    </button>
    <button type="button" class="btn btn-vip" @click="$emit('addVip')">
      New VIP Order
    </button>
    <div class="bot-actions">
      <button type="button" class="btn btn-bot" @click="$emit('addBot')">+ Bot</button>
      <button
        type="button"
        class="btn btn-bot-outline"
        :disabled="!canRemoveBot"
        @click="$emit('removeBot')"
      >
        − Bot
      </button>
    </div>
  </section>
</template>

<style scoped>
.action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.btn {
  padding: 0.5625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  border: none;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-normal {
  background: #f3f4f6;
  color: #374151;
}

.btn-normal:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-vip {
  background: #fef3c7;
  color: #92400e;
}

.btn-vip:hover:not(:disabled) {
  background: #fde68a;
}

.bot-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.btn-bot {
  background: var(--color-processing);
  color: #fff;
}

.btn-bot:hover:not(:disabled) {
  background: #2563eb;
}

.btn-bot-outline {
  background: #fff;
  color: var(--color-processing);
  border: 1px solid var(--color-processing);
}

.btn-bot-outline:hover:not(:disabled) {
  background: #eff6ff;
}
</style>
