<script setup lang="ts">
import type { BotStats } from '@/domain/types'

defineProps<{
  stats: BotStats
}>()
</script>

<template>
  <section class="bot-summary">
    <div class="summary-item">
      <span class="label">Total Bots</span>
      <span class="value">{{ stats.total }}</span>
    </div>
    <div class="divider" />
    <div class="summary-item processing">
      <span class="label">Processing</span>
      <span class="value">{{ stats.processing }}</span>
    </div>
    <div class="divider" />
    <div class="summary-item idle">
      <span class="label">Idle</span>
      <span class="value">{{ stats.idle }}</span>
    </div>
  </section>
</template>

<style scoped>
.bot-summary {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 1rem;
  padding: 0.875rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.label {
  font-size: 0.8125rem;
  color: var(--color-muted);
  font-weight: 500;
}

.value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.summary-item.processing .value {
  color: var(--color-processing);
}

.summary-item.idle .value {
  color: var(--color-complete);
}

.divider {
  width: 1px;
  height: 1.75rem;
  background: var(--color-border);
}
</style>
