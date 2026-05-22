<script setup>
import { ref, onUnmounted } from 'vue'

const PROCESS_DURATION = 10_000 // 10 seconds per order

const pendingOrders = ref([])
const completedOrders = ref([])
const bots = ref([])
const orderCounter = ref(0)
const botCounter = ref(0)
const now = ref(Date.now())

const tickInterval = setInterval(() => { now.value = Date.now() }, 100)

onUnmounted(() => {
  clearInterval(tickInterval)
  bots.value.forEach(bot => { if (bot.timerId) clearTimeout(bot.timerId) })
})

// ─── Orders ──────────────────────────────────────────────────────────────────

function addNormalOrder() {
  const order = { id: ++orderCounter.value, type: 'normal' }
  pendingOrders.value.push(order)
  tryAssignOrders()
}

function addVIPOrder() {
  const order = { id: ++orderCounter.value, type: 'vip' }
  // Insert after the last existing VIP order, before all Normal orders
  let insertIdx = 0
  for (let i = 0; i < pendingOrders.value.length; i++) {
    if (pendingOrders.value[i].type === 'vip') insertIdx = i + 1
  }
  pendingOrders.value.splice(insertIdx, 0, order)
  tryAssignOrders()
}

function returnOrderToQueue(order) {
  if (order.type === 'vip') {
    let insertIdx = 0
    for (let i = 0; i < pendingOrders.value.length; i++) {
      if (pendingOrders.value[i].type === 'vip') insertIdx = i + 1
    }
    pendingOrders.value.splice(insertIdx, 0, order)
  } else {
    pendingOrders.value.push(order)
  }
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

function addBot() {
  bots.value.push({ id: ++botCounter.value, status: 'idle', currentOrder: null, timerId: null, startTime: null })
  tryAssignOrders()
}

function removeBot() {
  if (bots.value.length === 0) return
  const bot = bots.value[bots.value.length - 1]
  bots.value.pop()

  if (bot.timerId !== null) {
    clearTimeout(bot.timerId)
    const order = bot.currentOrder
    bot.currentOrder = null
    returnOrderToQueue(order)
  }
}

function tryAssignOrders() {
  for (const bot of bots.value) {
    if (pendingOrders.value.length === 0) break
    if (bot.status === 'idle') {
      const order = pendingOrders.value.shift()
      bot.currentOrder = order
      bot.status = 'processing'
      bot.startTime = Date.now()
      bot.timerId = setTimeout(() => {
        completedOrders.value.unshift(order)
        bot.currentOrder = null
        bot.status = 'idle'
        bot.timerId = null
        bot.startTime = null
        tryAssignOrders()
      }, PROCESS_DURATION)
    }
  }
}

function getBotProgress(bot) {
  if (!bot.startTime) return 0
  return Math.min(100, ((now.value - bot.startTime) / PROCESS_DURATION) * 100)
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-title">
        <span class="logo">🍟</span>
        <h1>McDonald's Order Controller</h1>
      </div>
      <div class="controls">
        <button class="btn btn-normal" @click="addNormalOrder">New Normal Order</button>
        <button class="btn btn-vip" @click="addVIPOrder">New VIP Order</button>
        <button class="btn btn-add-bot" @click="addBot">+ Bot</button>
        <button class="btn btn-remove-bot" @click="removeBot" :disabled="bots.length === 0">- Bot</button>
      </div>
    </header>

    <main class="board">
      <!-- PENDING -->
      <section class="column">
        <h2 class="column-title pending-title">
          PENDING
          <span class="badge">{{ pendingOrders.length }}</span>
        </h2>
        <TransitionGroup name="list" tag="ul" class="order-list">
          <li
            v-for="order in pendingOrders"
            :key="order.id"
            class="order-card"
            :class="order.type"
          >
            <span class="order-type-badge" :class="order.type">
              {{ order.type === 'vip' ? '⭐ VIP' : '👤 Normal' }}
            </span>
            <span class="order-number">Order #{{ order.id }}</span>
          </li>
        </TransitionGroup>
        <p v-if="pendingOrders.length === 0" class="empty-hint">No pending orders</p>
      </section>

      <!-- BOTS -->
      <section class="column">
        <h2 class="column-title bots-title">
          BOTS
          <span class="badge">{{ bots.length }}</span>
        </h2>
        <TransitionGroup name="list" tag="ul" class="order-list">
          <li
            v-for="bot in bots"
            :key="bot.id"
            class="bot-card"
            :class="bot.status"
          >
            <div class="bot-header">
              <span class="bot-name">🤖 Bot #{{ bot.id }}</span>
              <span class="status-dot" :class="bot.status">{{ bot.status.toUpperCase() }}</span>
            </div>
            <template v-if="bot.currentOrder">
              <div class="bot-order-info">
                Processing: <strong>#{{ bot.currentOrder.id }}</strong>
                <span class="order-type-badge small" :class="bot.currentOrder.type">
                  {{ bot.currentOrder.type === 'vip' ? 'VIP' : 'Normal' }}
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: getBotProgress(bot) + '%' }"></div>
              </div>
              <div class="progress-label">
                {{ Math.round(getBotProgress(bot)) }}%
              </div>
            </template>
            <div v-else class="bot-idle-text">Waiting for orders...</div>
          </li>
        </TransitionGroup>
        <p v-if="bots.length === 0" class="empty-hint">No bots active — click <strong>+ Bot</strong></p>
      </section>

      <!-- COMPLETE -->
      <section class="column">
        <h2 class="column-title complete-title">
          COMPLETE
          <span class="badge">{{ completedOrders.length }}</span>
        </h2>
        <TransitionGroup name="list" tag="ul" class="order-list">
          <li
            v-for="order in completedOrders"
            :key="order.id"
            class="order-card done"
            :class="order.type"
          >
            <span class="order-type-badge" :class="order.type">
              {{ order.type === 'vip' ? '⭐ VIP' : '👤 Normal' }}
            </span>
            <span class="order-number">Order #{{ order.id }}</span>
            <span class="checkmark">✓</span>
          </li>
        </TransitionGroup>
        <p v-if="completedOrders.length === 0" class="empty-hint">No completed orders</p>
      </section>
    </main>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ─── Header ──────────────────────────────────────────── */
.header {
  background: #da291c;
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo { font-size: 2rem; }

h1 {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: .3px;
}

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-size: .9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform .1s, opacity .1s;
}
.btn:active { transform: scale(.96); }
.btn:disabled { opacity: .45; cursor: not-allowed; }

.btn-normal  { background: #fff; color: #333; }
.btn-vip     { background: #ffcc00; color: #333; }
.btn-add-bot { background: #27ae60; color: #fff; }
.btn-remove-bot { background: #e74c3c; color: #fff; }

/* ─── Board ───────────────────────────────────────────── */
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 24px;
  flex: 1;
}

@media (max-width: 768px) {
  .board { grid-template-columns: 1fr; }
}

.column {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 300px;
}

.column-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: .8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 2px solid #eee;
}

.pending-title  { color: #e67e22; border-bottom-color: #e67e22; }
.bots-title     { color: #2980b9; border-bottom-color: #2980b9; }
.complete-title { color: #27ae60; border-bottom-color: #27ae60; }

.badge {
  background: #eee;
  color: #555;
  font-size: .75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
  margin-left: auto;
}

.order-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ─── Order Card ──────────────────────────────────────── */
.order-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fafafa;
  border: 1.5px solid #e8e8e8;
  transition: all .2s;
}

.order-card.vip   { border-left: 4px solid #ffcc00; background: #fffef0; }
.order-card.normal { border-left: 4px solid #aaa; }
.order-card.done  { opacity: .7; }

.order-type-badge {
  font-size: .75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 99px;
  white-space: nowrap;
}
.order-type-badge.vip    { background: #ffcc00; color: #7a6000; }
.order-type-badge.normal { background: #e0e0e0; color: #555; }
.order-type-badge.small  { font-size: .7rem; padding: 2px 6px; }

.order-number { font-weight: 600; color: #333; font-size: .9rem; }

.checkmark {
  margin-left: auto;
  font-size: 1.1rem;
  color: #27ae60;
  font-weight: 700;
}

/* ─── Bot Card ────────────────────────────────────────── */
.bot-card {
  padding: 14px;
  border-radius: 8px;
  background: #fafafa;
  border: 1.5px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all .2s;
}
.bot-card.processing { border-color: #2980b9; background: #f0f7ff; }
.bot-card.idle       { border-color: #ccc; }

.bot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bot-name { font-weight: 700; font-size: .95rem; color: #222; }

.status-dot {
  font-size: .7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 99px;
}
.status-dot.processing { background: #2980b9; color: white; }
.status-dot.idle       { background: #95a5a6; color: white; }

.bot-order-info {
  font-size: .85rem;
  color: #444;
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-track {
  height: 6px;
  background: #dde;
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2980b9, #27ae60);
  border-radius: 99px;
  transition: width .1s linear;
}

.progress-label {
  font-size: .75rem;
  color: #888;
  text-align: right;
}

.bot-idle-text { font-size: .83rem; color: #aaa; font-style: italic; }

.empty-hint { font-size: .83rem; color: #bbb; font-style: italic; text-align: center; padding: 12px 0; }

/* ─── List Transitions ────────────────────────────────── */
.list-enter-active, .list-leave-active { transition: all .3s ease; }
.list-enter-from { opacity: 0; transform: translateY(-10px); }
.list-leave-to   { opacity: 0; transform: translateX(20px); }
.list-move       { transition: transform .3s ease; }
</style>
