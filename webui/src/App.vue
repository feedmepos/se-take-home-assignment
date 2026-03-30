<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrdersStore } from './stores/orders'
import { useBotsStore } from './stores/bots'
import { useWebSocket } from './composables/useWebSocket'
import type { WsEvent, OrderType, OrderStatus, BotStatus } from './types'
import ActionBar from './components/ActionBar.vue'
import KanbanBoard from './components/KanbanBoard.vue'
import BotPanel from './components/BotPanel.vue'

const { t, locale } = useI18n()
const ordersStore = useOrdersStore()
const botsStore = useBotsStore()

/** 切换语言 */
function setLocale(lang: string) {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

/** 处理 WebSocket 事件 */
function handleWsEvent(event: WsEvent) {
  const d = event.data as Record<string, unknown>

  switch (event.type) {
    case 'order_created': {
      // 后端 WS 发送 order_id，前端统一用 id
      ordersStore.upsertOrder({
        id: String(d.order_id ?? ''),
        type: (d.type as OrderType) ?? 'NORMAL',
        status: (d.status as OrderStatus) ?? 'PENDING',
        bot_id: null,
        created_at: (d.created_at as string) ?? event.timestamp,
        processing_at: null,
        completed_at: null,
      })
      break
    }
    case 'order_processing': {
      ordersStore.upsertOrder({
        id: String(d.order_id ?? ''),
        type: (d.type as OrderType) ?? 'NORMAL',
        status: 'PROCESSING',
        bot_id: String(d.bot_id ?? ''),
        created_at: (d.created_at as string) ?? event.timestamp,
        processing_at: (d.processing_at as string) ?? event.timestamp,
        completed_at: null,
      })
      // 同步更新 Bot 状态为 ACTIVE
      botsStore.upsertBot({
        bot_id: String(d.bot_id ?? ''),
        status: 'ACTIVE',
        processing_order_id: String(d.order_id ?? ''),
        created_at: '',
      })
      break
    }
    case 'order_complete': {
      ordersStore.upsertOrder({
        id: String(d.order_id ?? ''),
        type: (d.type as OrderType) ?? 'NORMAL',
        status: 'COMPLETE',
        bot_id: String(d.bot_id ?? ''),
        created_at: (d.created_at as string) ?? event.timestamp,
        processing_at: (d.processing_at as string) ?? null,
        completed_at: (d.completed_at as string) ?? event.timestamp,
      })
      break
    }
    case 'order_returned': {
      ordersStore.upsertOrder({
        id: String(d.order_id ?? ''),
        type: (d.type as OrderType) ?? 'NORMAL',
        status: 'PENDING',
        bot_id: null,
        created_at: (d.created_at as string) ?? event.timestamp,
        processing_at: null,
        completed_at: null,
      })
      break
    }
    case 'bot_created': {
      botsStore.upsertBot({
        bot_id: String(d.bot_id ?? ''),
        status: (d.status as BotStatus) ?? 'ACTIVE',
        processing_order_id: null,
        created_at: (d.created_at as string) ?? event.timestamp,
      })
      break
    }
    case 'bot_destroyed': {
      botsStore.removeBotById(String(d.bot_id ?? ''))
      break
    }
    case 'bot_idle': {
      botsStore.upsertBot({
        bot_id: String(d.bot_id ?? ''),
        status: 'IDLE',
        processing_order_id: null,
        created_at: '',
      })
      break
    }
    case 'system_reset': {
      ordersStore.clearAll()
      botsStore.clearAll()
      break
    }
    default:
      console.warn('[App] 未知事件类型:', event.type, event.data)
  }
}

// 启动 WebSocket 连接
const { status: wsStatus } = useWebSocket(handleWsEvent)

// 初始加载订单数据
onMounted(() => {
  ordersStore.fetchOrders()
})
</script>

<template>
  <div class="min-h-screen bg-[#0F0F1A] flex flex-col" data-testid="app-root">
    <!-- 顶部导航栏 -->
    <header class="border-b border-[#2A2A45] bg-[#0F0F1A]/80 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <!-- 左侧 Logo -->
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-lg bg-[#DA291C] flex items-center justify-center font-bold text-white text-sm"
          >
            M
          </div>
          <div>
            <h1 class="text-base font-bold text-[#E8E8ED] leading-tight">
              {{ t('title') }}
            </h1>
            <p class="text-[10px] text-[#8888A0] leading-tight">McDonald's Order Manager</p>
          </div>
        </div>

        <!-- 右侧：语言切换 + 连接状态 -->
        <div class="flex items-center gap-3">
          <!-- 语言切换 -->
          <div class="flex items-center text-xs" data-testid="lang-switcher">
            <button
              class="px-1.5 py-0.5 rounded-l transition-colors"
              :class="locale === 'zh-CN'
                ? 'bg-[#DA291C] text-white font-bold'
                : 'bg-[#1A1A2E] text-[#8888A0] hover:text-[#E8E8ED]'"
              data-testid="lang-zh"
              @click="setLocale('zh-CN')"
            >
              {{ t('langZh') }}
            </button>
            <button
              class="px-1.5 py-0.5 rounded-r transition-colors"
              :class="locale === 'en-US'
                ? 'bg-[#DA291C] text-white font-bold'
                : 'bg-[#1A1A2E] text-[#8888A0] hover:text-[#E8E8ED]'"
              data-testid="lang-en"
              @click="setLocale('en-US')"
            >
              {{ t('langEn') }}
            </button>
          </div>

          <!-- 连接状态 -->
          <span
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-[#10B981]': wsStatus === 'CONNECTED',
              'bg-[#F59E0B] animate-pulse': wsStatus === 'CONNECTING',
              'bg-[#EF4444]': wsStatus === 'DISCONNECTED',
            }"
          />
          <span class="text-[11px] text-[#8888A0]">
            {{ wsStatus === 'CONNECTED' ? t('wsConnected') : wsStatus === 'CONNECTING' ? t('wsConnecting') : t('wsDisconnected') }}
          </span>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col gap-4 min-h-0">
      <!-- 操作栏 -->
      <ActionBar />

      <!-- 主体：看板 + Bot 面板 -->
      <div class="flex gap-4 flex-1 min-h-0">
        <!-- 看板 -->
        <div class="flex-1 min-h-0">
          <KanbanBoard />
        </div>

        <!-- Bot 侧边栏 -->
        <aside class="w-64 shrink-0 hidden lg:block">
          <BotPanel />
        </aside>
      </div>
    </main>

    <!-- 底部状态栏 -->
    <footer class="border-t border-[#2A2A45] bg-[#0F0F1A]/80">
      <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-[11px] text-[#8888A0] font-mono">
        <span>
          {{ t('footerOrders') }}: {{ ordersStore.orders.length }} |
          {{ t('footerPending') }}: {{ ordersStore.pendingOrders.length }} |
          {{ t('footerProcessing') }}: {{ ordersStore.processingOrders.length }} |
          {{ t('footerComplete') }}: {{ ordersStore.completeOrders.length }}
        </span>
        <span>
          {{ t('footerBots') }}: {{ botsStore.bots.length }} ({{ botsStore.idleBots.length }} {{ t('footerIdle') }})
        </span>
      </div>
    </footer>

    <!-- 移动端 Bot 面板（底部弹出） -->
    <div class="lg:hidden fixed bottom-10 left-0 right-0 z-20 px-4">
      <details class="group">
        <summary
          class="flex items-center justify-center gap-2 px-4 py-2 rounded-t-xl
                 bg-[#1A1A2E] border border-[#2A2A45] border-b-0 text-xs text-[#E8E8ED] cursor-pointer"
        >
          <span>{{ t('botMobileTitle') }}</span>
          <span class="text-[#8888A0]">({{ botsStore.bots.length }})</span>
        </summary>
        <div class="rounded-b-xl overflow-hidden">
          <BotPanel />
        </div>
      </details>
    </div>
  </div>
</template>
