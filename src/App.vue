<template>
  <div class="app">
    <header class="app-header">
      <span class="logo">🍟</span>
      <div>
        <h1>McDonald's Order Controller</h1>
        <p class="subtitle">Automated Cooking System</p>
      </div>
    </header>

    <!-- Controls -->
    <section class="controls card">
      <div class="control-group">
        <h3>Customer Orders</h3>
        <div class="btn-row">
          <button class="btn btn-normal" @click="addNormalOrder">New Normal Order</button>
          <button class="btn btn-vip" @click="addVIPOrder">New VIP Order</button>
        </div>
      </div>
      <div class="control-divider" />
      <div class="control-group">
        <h3>Bot Management</h3>
        <div class="btn-row">
          <button class="btn btn-add" @click="addBot">+ Bot</button>
          <button class="btn btn-remove" :disabled="bots.length === 0" @click="removeBot">− Bot</button>
        </div>
      </div>
    </section>

    <!-- Bots -->
    <section class="card">
      <h2>Cooking Bots <span class="count">({{ bots.length }})</span></h2>
      <div class="bots-grid">
        <BotCard
          v-for="bot in bots"
          :key="bot.id"
          :bot="bot"
          :order="getOrderById(bot.currentOrderId)"
        />
        <p v-if="bots.length === 0" class="empty">No bots deployed — click <strong>+ Bot</strong> to add one</p>
      </div>
    </section>

    <!-- Orders -->
    <div class="orders-grid">
      <section class="card">
        <h2>Pending <span class="count">({{ pendingOrders.length }})</span></h2>
        <div class="orders-list">
          <OrderCard v-for="order in pendingOrders" :key="order.id" :order="order" />
          <p v-if="pendingOrders.length === 0" class="empty">No pending orders</p>
        </div>
      </section>

      <section class="card">
        <h2>Complete <span class="count">({{ completedOrders.length }})</span></h2>
        <div class="orders-list">
          <OrderCard v-for="order in completedOrders" :key="order.id" :order="order" />
          <p v-if="completedOrders.length === 0" class="empty">No completed orders yet</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import type { Order, Bot, OrderType } from './types'
import OrderCard from './components/OrderCard.vue'
import BotCard from './components/BotCard.vue'

export default defineComponent({
  name: 'App',
  components: { OrderCard, BotCard },

  setup() {
    const orders       = ref<Order[]>([])
    const bots         = ref<Bot[]>([])
    const pendingQueue = ref<number[]>([])
    const orderCounter = ref(1)
    const botCounter   = ref(1)
    const botTimers    = new Map<number, ReturnType<typeof setTimeout>>()

    const pendingOrders = computed(() =>
      pendingQueue.value
        .map((id: number) => orders.value.find((o: Order) => o.id === id))
        .filter((o: Order | undefined): o is Order => !!o)
    )

    const completedOrders = computed(() =>
      orders.value.filter((o: Order) => o.status === 'COMPLETE')
    )

    function getOrderById(id: number | null): Order | undefined {
      if (id === null) return undefined
      return orders.value.find((o: Order) => o.id === id)
    }

    function addOrder(type: OrderType): void {
      const id = orderCounter.value++
      orders.value.push({ id, type, status: 'PENDING' })

      if (type === 'VIP') {
        let insertIdx = 0
        for (let i = 0; i < pendingQueue.value.length; i++) {
          if (orders.value.find((o: Order) => o.id === pendingQueue.value[i])?.type === 'VIP') {
            insertIdx = i + 1
          }
        }
        pendingQueue.value.splice(insertIdx, 0, id)
      } else {
        pendingQueue.value.push(id)
      }

      assignIdleBots()
    }

    function assignIdleBots(): void {
      for (const bot of bots.value) {
        if (bot.status !== 'IDLE') continue
        const nextId = pendingQueue.value.find((id: number) =>
          orders.value.find((o: Order) => o.id === id)?.status === 'PENDING'
        )
        if (nextId !== undefined) startProcessing(bot, nextId)
      }
    }

    function startProcessing(bot: Bot, orderId: number): void {
      const order = orders.value.find((o: Order) => o.id === orderId)
      if (!order) return
      bot.status = 'PROCESSING'
      bot.currentOrderId = orderId
      order.status = 'PROCESSING'
      botTimers.set(bot.id, setTimeout(() => completeOrder(bot, orderId), 10_000))
    }

    function completeOrder(bot: Bot, orderId: number): void {
      if (!bots.value.includes(bot)) return
      const order = orders.value.find((o: Order) => o.id === orderId)
      if (order) {
        order.status = 'COMPLETE'
        const idx = pendingQueue.value.indexOf(orderId)
        if (idx !== -1) pendingQueue.value.splice(idx, 1)
      }
      bot.currentOrderId = null
      botTimers.delete(bot.id)

      const nextId = pendingQueue.value.find((id: number) =>
        orders.value.find((o: Order) => o.id === id)?.status === 'PENDING'
      )
      if (nextId !== undefined) startProcessing(bot, nextId)
      else bot.status = 'IDLE'
    }

    function addBot(): void {
      const bot: Bot = { id: botCounter.value++, status: 'IDLE', currentOrderId: null }
      bots.value.push(bot)
      const nextId = pendingQueue.value.find((id: number) =>
        orders.value.find((o: Order) => o.id === id)?.status === 'PENDING'
      )
      if (nextId !== undefined) startProcessing(bot, nextId)
    }

    function removeBot(): void {
      if (bots.value.length === 0) return
      const bot = bots.value[bots.value.length - 1]
      const timer = botTimers.get(bot.id)
      if (timer) { clearTimeout(timer); botTimers.delete(bot.id) }
      if (bot.currentOrderId !== null) {
        const order = orders.value.find((o: Order) => o.id === bot.currentOrderId)
        if (order) order.status = 'PENDING'
      }
      bots.value.pop()
    }

    return {
      bots,
      pendingOrders,
      completedOrders,
      getOrderById,
      addNormalOrder: () => addOrder('NORMAL'),
      addVIPOrder:    () => addOrder('VIP'),
      addBot,
      removeBot,
    }
  }
})
</script>

<style scoped>
.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #da291c;
  color: #fff;
  padding: 1rem 1.5rem;
  border-radius: 14px;
}
.logo     { font-size: 2rem; line-height: 1; }
h1        { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; }
.subtitle { font-size: 0.8rem; opacity: 0.8; margin-top: 0.1rem; }

.card {
  background: #fff;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}

h2     { font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; }
.count { font-weight: 400; color: #aaa; }

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.25rem;
}
.control-group h3 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  margin-bottom: 0.5rem;
}
.control-divider { width: 1px; background: #f0ede7; align-self: stretch; }
.btn-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.btn {
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: opacity 0.15s, transform 0.1s;
}
.btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.38; cursor: not-allowed; }

.btn-normal { background: #ffc72c; color: #27251f; }
.btn-vip    { background: #27251f; color: #ffc72c; }
.btn-add    { background: #da291c; color: #fff; }
.btn-remove { background: #ebebeb; color: #555; }

.bots-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  min-height: 2.5rem;
}

.orders-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 440px;
  overflow-y: auto;
}

.empty {
  color: #ccc;
  font-size: 0.8rem;
  text-align: center;
  padding: 1rem 0;
}
</style>
