<script setup>
defineEmits(['add-normal', 'add-vip', 'add-bot', 'remove-bot'])
</script>

<template>
  <div class="controls">
    <div class="control-group">
      <h3>New Order</h3>
      <div class="buttons">
        <button @click="$emit('add-normal')" class="btn primary">New Normal Order</button>
        <button @click="$emit('add-vip')" class="btn vip">New VIP Order</button>
      </div>
    </div>
    
    <div class="control-group">
      <h3>Manage Bots</h3>
      <div class="buttons">
        <button @click="$emit('add-bot')" class="btn secondary">+ Bot</button>
        <button @click="$emit('remove-bot')" class="btn danger">- Bot</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.control-group {
  flex: 1;
  min-width: 300px;
  background: var(--surface-card);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

h3 {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  flex: 1;
  padding: 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}

.btn:active {
  transform: scale(0.98);
}

.btn:hover {
  opacity: 0.9;
}

.btn.primary {
  background: var(--primary-color);
  color: white;
}

.btn.vip {
  background: var(--vip-color);
  color: white;
}

.btn.secondary {
  background: var(--secondary-color);
  color: white;
}

.btn.danger {
  background: var(--danger-color);
  color: white;
}
</style>
