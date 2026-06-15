<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const state = ref({
  pending: [],
  processing: [],
  completed: [],
  bots: [],
  events: [],
  totalOrders: 0,
  completedVip: 0,
  completedNormal: 0,
})
const actionBusy = ref(false)
const error = ref('')
let timerId

const activeBots = computed(() => state.value.bots.length)
const idleBots = computed(() => state.value.bots.filter((bot) => bot.status === 'IDLE').length)
const busyBots = computed(() => state.value.bots.filter((bot) => bot.status === 'PROCESSING').length)

async function request(path, options = {}) {
  const isAction = options.method && options.method !== 'GET'
  if (isAction) {
    actionBusy.value = true
  }
  error.value = ''
  try {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }
    state.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Request failed'
  } finally {
    if (isAction) {
      actionBusy.value = false
    }
  }
}

function loadState() {
  return request('/api/state')
}

function addOrder(kind) {
  return request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  })
}

function addBot() {
  return request('/api/bots', { method: 'POST', body: '{}' })
}

function removeBot() {
  return request('/api/bots/newest', { method: 'DELETE' })
}

function reset() {
  return request('/api/reset', { method: 'POST', body: '{}' })
}

function progress(bot) {
  if (bot.status !== 'PROCESSING') return 0
  const remaining = Math.max(0, Math.min(10000, bot.remainingMs || 0))
  return Math.round(((10000 - remaining) / 10000) * 100)
}

onMounted(() => {
  loadState()
  timerId = window.setInterval(loadState, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timerId)
})
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">McDonald's Order Controller</p>
        <h1>Kitchen Flow</h1>
      </div>
      <div class="actions">
        <button class="primary" :disabled="actionBusy" @click="addOrder('Normal')">New Normal Order</button>
        <button class="vip" :disabled="actionBusy" @click="addOrder('VIP')">New VIP Order</button>
        <button :disabled="actionBusy" @click="addBot">+ Bot</button>
        <button :disabled="actionBusy || activeBots === 0" @click="removeBot">- Bot</button>
        <button class="ghost" :disabled="actionBusy" @click="reset">Reset</button>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="stats" aria-label="Kitchen metrics">
      <div>
        <span>Total</span>
        <strong>{{ state.totalOrders }}</strong>
      </div>
      <div>
        <span>Bots</span>
        <strong>{{ activeBots }}</strong>
      </div>
      <div>
        <span>Busy</span>
        <strong>{{ busyBots }}</strong>
      </div>
      <div>
        <span>Idle</span>
        <strong>{{ idleBots }}</strong>
      </div>
      <div>
        <span>Complete</span>
        <strong>{{ state.completed.length }}</strong>
      </div>
    </section>

    <section class="workspace">
      <section class="lane pending">
        <div class="lane-title">
          <h2>Pending</h2>
          <span>{{ state.pending.length }}</span>
        </div>
        <div class="order-list">
          <article v-for="order in state.pending" :key="order.id" class="order" :class="order.kind.toLowerCase()">
            <strong>#{{ order.id }}</strong>
            <span>{{ order.kind }}</span>
            <small>{{ order.createdAt }}</small>
          </article>
          <p v-if="state.pending.length === 0" class="empty">No pending orders</p>
        </div>
      </section>

      <section class="lane processing">
        <div class="lane-title">
          <h2>Processing</h2>
          <span>{{ state.processing.length }}</span>
        </div>
        <div class="bot-grid">
          <article v-for="bot in state.bots" :key="bot.id" class="bot" :class="{ idle: bot.status === 'IDLE' }">
            <div class="bot-head">
              <strong>Bot #{{ bot.id }}</strong>
              <span>{{ bot.status }}</span>
            </div>
            <p v-if="bot.orderId">Order #{{ bot.orderId }} · {{ bot.orderKind }}</p>
            <p v-else>Ready</p>
            <div class="meter">
              <i :style="{ width: `${progress(bot)}%` }"></i>
            </div>
            <small v-if="bot.completeAt">Complete at {{ bot.completeAt }}</small>
          </article>
          <p v-if="state.bots.length === 0" class="empty">No bots online</p>
        </div>
      </section>

      <section class="lane complete">
        <div class="lane-title">
          <h2>Complete</h2>
          <span>{{ state.completed.length }}</span>
        </div>
        <div class="order-list">
          <article v-for="order in state.completed" :key="order.id" class="order done" :class="order.kind.toLowerCase()">
            <strong>#{{ order.id }}</strong>
            <span>{{ order.kind }}</span>
            <small>{{ order.completedAt }}</small>
          </article>
          <p v-if="state.completed.length === 0" class="empty">No completed orders</p>
        </div>
      </section>
    </section>

    <section class="activity">
      <div class="lane-title">
        <h2>Activity</h2>
        <span>{{ state.events.length }}</span>
      </div>
      <ol>
        <li v-for="event in [...state.events].reverse()" :key="event">{{ event }}</li>
      </ol>
    </section>
  </main>
</template>
