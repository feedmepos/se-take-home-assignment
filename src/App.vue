<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  Activity,
  Bot,
  CheckCircle2,
  ChefHat,
  Clock3,
  Crown,
  Download,
  Minus,
  Plus,
  ReceiptText,
  Trash2,
  X
} from 'lucide-vue-next'
import { OrderController, PROCESSING_MS, type Bot as BotItem, type Order, type OrderType } from './orderController'
import { exportCompletedOrders } from './exportCompletedOrders'

const controller = reactive(new OrderController())
const now = ref(Date.now())
const pendingDeleteBotId = ref<number | null>(null)
let ticker: ReturnType<typeof setInterval> | null = null

const processingBots = computed(() => controller.bots.filter((bot) => bot.status === 'PROCESSING'))
const idleBots = computed(() => controller.bots.filter((bot) => bot.status === 'IDLE'))
const pendingDeleteBot = computed(() =>
  pendingDeleteBotId.value === null ? null : controller.bots.find((bot) => bot.id === pendingDeleteBotId.value) ?? null
)
const activeOrderIds = computed(() =>
  processingBots.value.map((bot) => bot.currentOrder?.id).filter((id): id is number => Boolean(id))
)
const processingOrders = computed(() =>
  processingBots.value.map((bot) => bot.currentOrder).filter((order): order is Order => Boolean(order))
)
const pendingCounts = computed(() => countOrders(controller.pendingOrders))
const processingCounts = computed(() => countOrders(processingOrders.value))
const completeCounts = computed(() => countOrders(controller.completedOrders))

function countOrders(orders: Order[]) {
  return orders.reduce(
    (counts, order) => {
      counts.total += 1
      counts[order.type] += 1
      return counts
    },
    { total: 0, NORMAL: 0, VIP: 0 } as Record<'total' | OrderType, number>
  )
}

function createNormalOrder() {
  controller.createOrder('NORMAL')
}

function createVipOrder() {
  controller.createOrder('VIP')
}

function exportExcel() {
  exportCompletedOrders(controller.completedOrders)
}

function addBot() {
  controller.addBot()
}

function removeBot() {
  const latestBot = controller.bots[controller.bots.length - 1]

  if (latestBot) {
    pendingDeleteBotId.value = latestBot.id
  }
}

function removeSpecificBot(botId: number) {
  pendingDeleteBotId.value = botId
}

function cancelDeleteBot() {
  pendingDeleteBotId.value = null
}

function confirmDeleteBot() {
  if (pendingDeleteBot.value) {
    controller.removeBot(pendingDeleteBot.value.id)
  }

  pendingDeleteBotId.value = null
}

function botProgress(bot: BotItem) {
  if (bot.startedAt === null || bot.status !== 'PROCESSING') {
    return 0
  }

  return Math.min(100, Math.max(0, ((now.value - bot.startedAt) / PROCESSING_MS) * 100))
}

function botRemainingMs(bot: BotItem) {
  if (bot.startedAt === null || bot.status !== 'PROCESSING') {
    return 0
  }

  return Math.max(0, PROCESSING_MS - (now.value - bot.startedAt))
}

function formatOrder(order: Order) {
  return `#${order.id.toString().padStart(3, '0')}`
}

function formatClock(timestamp: number | null) {
  if (timestamp === null) {
    return '--'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(timestamp)
}

function formatCountdown(milliseconds: number) {
  return `${Math.ceil(milliseconds / 1000)}s`
}

onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 200)
})

onBeforeUnmount(() => {
  controller.clearTimers()
  if (ticker) {
    clearInterval(ticker)
  }
})
</script>

<template>
  <main class="app-shell">
    <section class="control-band" aria-label="Order controls">
      <div class="brand-lockup">
        <span class="brand-mark"><ChefHat :size="24" /></span>
        <div>
          <p class="eyebrow">Kitchen Ops</p>
          <h1>Order Controller</h1>
        </div>
      </div>

      <div class="command-row">
        <button class="command-button normal" type="button" title="New Normal Order" @click="createNormalOrder">
          <ReceiptText :size="18" />
          <span>New Normal Order</span>
        </button>
        <button class="command-button vip" type="button" title="New VIP Order" @click="createVipOrder">
          <Crown :size="18" />
          <span>New VIP Order</span>
        </button>
        <button class="icon-command add" type="button" title="+ Bot" @click="addBot">
          <Plus :size="20" />
          <span>Bot</span>
        </button>
        <button
          class="icon-command remove"
          type="button"
          title="- Bot"
          :disabled="controller.bots.length === 0"
          @click="removeBot"
        >
          <Minus :size="20" />
          <span>Bot</span>
        </button>
      </div>
    </section>

    <section class="metrics-grid" aria-label="Kitchen metrics">
      <article class="metric">
        <span>Pending</span>
        <strong>{{ controller.pendingOrders.length }}</strong>
      </article>
      <article class="metric">
        <span>Complete</span>
        <strong>{{ controller.completedOrders.length }}</strong>
      </article>
      <article class="metric">
        <span>Active Bots</span>
        <strong>{{ controller.bots.length }}</strong>
      </article>
      <article class="metric">
        <span>Idle</span>
        <strong>{{ idleBots.length }}</strong>
      </article>
      <article class="metric">
        <span>Processing</span>
        <strong>{{ processingBots.length }}</strong>
      </article>
    </section>

    <section class="workspace">
      <div class="queue-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <div>
              <p class="eyebrow">Queue</p>
              <h2>PENDING</h2>
            </div>
            <Clock3 :size="20" />
          </div>
          <div class="count-strip" aria-label="Pending order counts">
            <span><b>{{ pendingCounts.total }}</b>Total</span>
            <span><b>{{ pendingCounts.NORMAL }}</b>Normal</span>
            <span><b>{{ pendingCounts.VIP }}</b>VIP</span>
          </div>
        </div>

        <div v-if="controller.pendingOrders.length" class="order-list">
          <article
            v-for="order in controller.pendingOrders"
            :key="order.id"
            class="order-row"
            :class="order.type.toLowerCase()"
          >
            <div class="order-main">
              <span class="order-id">{{ formatOrder(order) }}</span>
              <span class="badge" :class="order.type.toLowerCase()">{{ order.type }}</span>
            </div>
            <div class="order-meta">
              <span>创建 {{ formatClock(order.createdAt) }}</span>
              <span>制作 {{ formatClock(order.cookingStartedAt) }}</span>
              <span>完成 {{ formatClock(order.completedAt) }}</span>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">No waiting orders</div>
      </div>

      <div class="queue-panel bot-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <div>
              <p class="eyebrow">Fleet</p>
              <h2>PROCESSING</h2>
            </div>
            <Bot :size="21" />
          </div>
          <div class="count-strip" aria-label="Processing order counts">
            <span><b>{{ processingCounts.total }}</b>Total</span>
            <span><b>{{ processingCounts.NORMAL }}</b>Normal</span>
            <span><b>{{ processingCounts.VIP }}</b>VIP</span>
          </div>
        </div>

        <div v-if="controller.bots.length" class="bot-list">
          <article v-for="bot in controller.bots" :key="bot.id" class="bot-row" :class="bot.status.toLowerCase()">
            <div class="bot-topline">
              <span class="bot-name">Bot {{ bot.id }}</span>
              <div class="bot-actions">
                <span class="status-pill" :class="bot.status.toLowerCase()">{{ bot.status }}</span>
                <button
                  class="bot-delete"
                  type="button"
                  :title="`Remove Bot ${bot.id}`"
                  :aria-label="`Remove Bot ${bot.id}`"
                  @click="removeSpecificBot(bot.id)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
            <div class="bot-assignment">
              <Activity :size="16" />
              <div v-if="bot.currentOrder" class="assignment-content">
                <div class="assignment-main">
                  <span>
                    Cooking {{ formatOrder(bot.currentOrder) }}
                    <b :class="bot.currentOrder.type.toLowerCase()">{{ bot.currentOrder.type }}</b>
                  </span>
                  <strong class="countdown-chip">{{ formatCountdown(botRemainingMs(bot)) }}</strong>
                </div>
                <div class="order-meta processing-meta">
                  <span>创建 {{ formatClock(bot.currentOrder.createdAt) }}</span>
                  <span>制作 {{ formatClock(bot.currentOrder.cookingStartedAt) }}</span>
                  <span>完成 {{ formatClock(bot.currentOrder.completedAt) }}</span>
                </div>
              </div>
              <span v-else>Ready for the next order</span>
            </div>
            <div class="progress-track" aria-hidden="true">
              <span :style="{ width: `${botProgress(bot)}%` }"></span>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">No bots online</div>
      </div>

      <div class="queue-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <div>
              <p class="eyebrow">Done</p>
              <h2>COMPLETE</h2>
            </div>
            <div class="panel-tools">
              <button
                class="export-button"
                type="button"
                title="Export completed orders to Excel"
                :disabled="controller.completedOrders.length === 0"
                @click="exportExcel"
              >
                <Download :size="16" />
                <span>Excel</span>
              </button>
              <CheckCircle2 :size="21" />
            </div>
          </div>
          <div class="count-strip" aria-label="Complete order counts">
            <span><b>{{ completeCounts.total }}</b>Total</span>
            <span><b>{{ completeCounts.NORMAL }}</b>Normal</span>
            <span><b>{{ completeCounts.VIP }}</b>VIP</span>
          </div>
        </div>

        <div v-if="controller.completedOrders.length" class="order-list">
          <article
            v-for="order in controller.completedOrders"
            :key="order.id"
            class="order-row complete"
            :class="order.type.toLowerCase()"
          >
            <div class="order-main">
              <span class="order-id">{{ formatOrder(order) }}</span>
              <span class="badge" :class="order.type.toLowerCase()">{{ order.type }}</span>
            </div>
            <div class="order-meta">
              <span>创建 {{ formatClock(order.createdAt) }}</span>
              <span>制作 {{ formatClock(order.cookingStartedAt) }}</span>
              <span>完成 {{ formatClock(order.completedAt) }}</span>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">No completed orders</div>
      </div>
    </section>

    <section class="timeline-strip" aria-label="Active order ids">
      <span>Active orders</span>
      <strong v-if="activeOrderIds.length">{{ activeOrderIds.map((id) => `#${id.toString().padStart(3, '0')}`).join(', ') }}</strong>
      <strong v-else>None</strong>
    </section>

    <Teleport to="body">
      <div
        v-if="pendingDeleteBot"
        class="modal-backdrop"
        role="presentation"
        @click.self="cancelDeleteBot"
      >
        <section
          class="confirm-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`delete-bot-title-${pendingDeleteBot.id}`"
        >
          <button class="dialog-close" type="button" aria-label="Cancel delete" @click="cancelDeleteBot">
            <X :size="18" />
          </button>
          <div class="dialog-icon">
            <Trash2 :size="22" />
          </div>
          <p class="eyebrow">Confirm Remove</p>
          <h2 :id="`delete-bot-title-${pendingDeleteBot.id}`">是否删除Bot {{ pendingDeleteBot.id }}？</h2>
          <p class="dialog-copy">
            <template v-if="pendingDeleteBot.currentOrder">
              Bot {{ pendingDeleteBot.id }} 正在处理 {{ formatOrder(pendingDeleteBot.currentOrder) }}。确认后该订单会回到 PENDING 队列。
            </template>
            <template v-else>Bot {{ pendingDeleteBot.id }} 当前空闲，确认后会从机器人列表中移除。</template>
          </p>
          <div class="dialog-actions">
            <button class="dialog-button secondary" type="button" @click="cancelDeleteBot">取消</button>
            <button class="dialog-button danger" type="button" @click="confirmDeleteBot">
              删除Bot {{ pendingDeleteBot.id }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </main>
</template>
