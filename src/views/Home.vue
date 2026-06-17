<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PROCESS_DURATION_MS, useOrderStore } from '@/store/order'
import { formatHHMMSS } from '@/utils/time'

const store = useOrderStore()

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 100)
})

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
})

const botProgress = (startedAt?: number) => {
  if (!startedAt) return 0
  const pct = Math.min(100, ((now.value - startedAt) / PROCESS_DURATION_MS) * 100)
  return Math.round(pct)
}

const elapsedSeconds = (startedAt?: number) => {
  if (!startedAt) return '0.0'
  const seconds = PROCESS_DURATION_MS / 1000
  return Math.min(seconds, (now.value - startedAt) / 1000).toFixed(1)
}

const totalSeconds = (PROCESS_DURATION_MS / 1000).toFixed(0)

const pendingList = computed(() => store.pending)
const completedList = computed(() => store.completed)
const botList = computed(() => store.bots)
</script>

<template>
  <div class="home-page">
    <h1 class="title">McDonald's Order Controller</h1>

    <div class="toolbar">
      <el-button type="primary" @click="store.addNormal">+ Normal Order</el-button>
      <el-button type="warning" @click="store.addVip">+ VIP Order</el-button>
      <el-button type="success" @click="store.addBot">+ Bot</el-button>
      <el-button type="danger" @click="store.removeBot" :disabled="botList.length === 0">
        - Bot
      </el-button>
    </div>

    <div class="columns">
      <el-card class="column">
        <template #header>
          <span class="column-title">PENDING ({{ pendingList.length }})</span>
        </template>
        <div v-if="pendingList.length === 0" class="empty">No pending orders</div>
        <ul class="order-list">
          <li v-for="o in pendingList" :key="o.id" class="order-item">
            <span class="order-id">#{{ o.id }}</span>
            <el-tag :type="o.type === 'VIP' ? 'warning' : 'info'" size="small">
              {{ o.type }}
            </el-tag>
            <span class="order-time">{{ formatHHMMSS(o.createdAt) }}</span>
          </li>
        </ul>
      </el-card>

      <el-card class="column">
        <template #header>
          <span class="column-title">COMPLETE ({{ completedList.length }})</span>
        </template>
        <div v-if="completedList.length === 0" class="empty">No completed orders</div>
        <ul class="order-list">
          <li v-for="o in completedList" :key="o.id" class="order-item">
            <span class="order-id">#{{ o.id }}</span>
            <el-tag :type="o.type === 'VIP' ? 'warning' : 'info'" size="small">
              {{ o.type }}
            </el-tag>
            <span class="order-time">done {{ formatHHMMSS(o.completedAt!) }}</span>
          </li>
        </ul>
      </el-card>
    </div>

    <el-card class="bot-card">
      <template #header>
        <span class="column-title">BOTS ({{ botList.length }})</span>
      </template>
      <div v-if="botList.length === 0" class="empty">No bots. Click "+ Bot" to add.</div>
      <ul class="bot-list">
        <li v-for="b in botList" :key="b.id" class="bot-item">
          <span class="bot-id">Bot #{{ b.id }}</span>
          <el-tag :type="b.status === 'BUSY' ? 'success' : 'info'" size="small">
            {{ b.status }}
          </el-tag>
          <template v-if="b.status === 'BUSY'">
            <span class="bot-order">order #{{ b.orderId }}</span>
            <el-progress
              class="bot-progress"
              :percentage="botProgress(b.startedAt)"
              :show-text="false"
              :stroke-width="8"
            />
            <span class="bot-elapsed">{{ elapsedSeconds(b.startedAt) }}s / {{ totalSeconds }}s</span>
          </template>
        </li>
      </ul>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  margin: 24px;
  max-width: 1200px;
}

.title {
  font-size: 24px;
  margin: 0 0 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.column-title {
  font-weight: 600;
}

.empty {
  color: #909399;
  font-size: 13px;
  padding: 8px 0;
}

.order-list,
.bot-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.order-id {
  font-family: monospace;
  font-weight: 600;
  min-width: 40px;
}

.order-time {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}

.bot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.bot-id {
  font-family: monospace;
  font-weight: 600;
  min-width: 60px;
}

.bot-order {
  font-family: monospace;
  color: #606266;
}

.bot-progress {
  flex: 1;
  min-width: 120px;
}

.bot-elapsed {
  font-family: monospace;
  font-size: 12px;
  color: #606266;
  min-width: 80px;
  text-align: right;
}
</style>
