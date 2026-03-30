<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Order } from '../types'

const props = defineProps<{
  order: Order
}>()

const { t } = useI18n()

const isVip = computed(() => props.order.type === 'VIP')
const isProcessing = computed(() => props.order.status === 'PROCESSING')
const isComplete = computed(() => props.order.status === 'COMPLETE')
const isPending = computed(() => props.order.status === 'PENDING')

/** 订单编号短显示 */
const shortId = computed(() => `#${props.order.id}`)

/** 类型标签 */
const typeLabel = computed(() => isVip.value ? 'VIP' : 'N')

/** 状态标签 */
const statusLabel = computed(() => {
  switch (props.order.status) {
    case 'PENDING': return t('statusPending')
    case 'PROCESSING': return t('statusProcessing')
    case 'COMPLETE': return t('statusComplete')
    default: return ''
  }
})

/** 进度条百分比（0-100） */
const progressPercent = ref(100)
/** 剩余秒数 */
const remainSeconds = ref(10)
let rafId: number | null = null

/** 解析 HH:MM:SS 时间为今天的时间戳（毫秒） */
function parseTime(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0
  const now = new Date()
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const s = parseInt(parts[2], 10)
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s).getTime()
}

/** 启动进度条动画 */
function startProgress() {
  stopProgress()
  if (!props.order.processing_at) return

  const startTime = parseTime(props.order.processing_at)
  const duration = 10000

  function tick() {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, duration - elapsed)
    progressPercent.value = (remaining / duration) * 100
    remainSeconds.value = Math.ceil(remaining / 1000)

    if (remaining > 0 && isProcessing.value) {
      rafId = requestAnimationFrame(tick)
    }
  }

  tick()
}

/** 停止进度条动画 */
function stopProgress() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

watch(isProcessing, (val) => {
  if (val) startProgress()
  else stopProgress()
}, { immediate: true })

onMounted(() => {
  if (isProcessing.value) startProgress()
})

onUnmounted(() => {
  stopProgress()
})

/** 悬浮 tooltip 定位 */
const cardRef = ref<HTMLElement | null>(null)
const showTooltip = ref(false)
const tooltipStyle = ref<Record<string, string>>({})

function onEnter() {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  const tipW = 170
  let left = rect.left + rect.width / 2 - tipW / 2
  if (left < 4) left = 4
  if (left + tipW > window.innerWidth - 4) left = window.innerWidth - tipW - 4
  tooltipStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${rect.top - 8}px`,
    transform: 'translateY(-100%)',
    zIndex: '9999',
  }
  showTooltip.value = true
}

function onLeave() {
  showTooltip.value = false
}
</script>

<template>
  <div
    ref="cardRef"
    class="order-card group relative rounded-lg p-1.5 border flex flex-col items-center justify-center w-[78px] min-h-[72px]"
    :class="[
      isVip ? 'vip-glow bg-[#252540] border-[#FFC72C]/30' : 'bg-[#1A1A2E] border-[#2A2A45]',
      isProcessing ? 'processing-pulse' : '',
    ]"
    :data-testid="`order-card-${order.id}`"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <!-- 顶部：图标 + VIP + 编号 -->
    <div class="flex items-center gap-1">
      <svg
        class="w-5 h-5 shrink-0"
        :class="isVip ? 'text-[#FFC72C]' : 'text-[#8B8BF5]'"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="13" y2="12" />
      </svg>
      <span v-if="isVip" class="text-[9px] text-[#FFC72C] leading-none">&#9733;</span>
      <span class="text-[11px] font-mono text-[#E8E8ED] leading-tight">{{ shortId }}</span>
    </div>

    <!-- 紧凑时间行（单行） -->
    <div class="text-[9px] text-[#8888A0] font-mono mt-0.5 w-full text-center truncate">
      <template v-if="isPending">
        {{ order.created_at }}
      </template>
      <template v-else-if="isProcessing">
        <span class="text-[#F59E0B]">B#{{ order.bot_id }}</span>
        <span class="text-[#10B981] ml-0.5">{{ order.processing_at }}</span>
      </template>
      <template v-else-if="isComplete">
        <span class="text-[#F59E0B]">B#{{ order.bot_id }}</span>
        <span class="text-[#10B981] ml-0.5">{{ order.completed_at }}</span>
      </template>
    </div>

    <!-- 进度条（仅 PROCESSING） -->
    <div v-if="isProcessing" class="w-full mt-0.5" data-testid="progress-bar">
      <div class="w-full h-1 bg-[#2A2A45] rounded-full overflow-hidden">
        <div
          class="h-full bg-[#10B981] rounded-full transition-none"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <span class="text-[8px] text-[#8888A0] font-mono">{{ remainSeconds }}s</span>
    </div>

    <!-- 悬浮详情面板（Teleport 到 body，避免被 overflow 裁剪） -->
    <Teleport to="body">
      <div
        v-if="showTooltip"
        :style="tooltipStyle"
        class="bg-[#0F0F1A] border border-[#2A2A45] rounded-lg p-2 shadow-xl
               min-w-[170px] text-left pointer-events-none"
      >
        <div class="text-[13px] font-mono text-[#E8E8ED] font-bold mb-1">
          {{ shortId }} <span :class="isVip ? 'text-[#FFC72C]' : 'text-[#8B8BF5]'">{{ typeLabel }}</span>
        </div>
        <div class="text-[12px] text-[#8888A0] font-mono">
          {{ t('statusPending').replace('待处理','状态') }}{{ statusLabel }}
        </div>
        <div class="text-[12px] text-[#8888A0] font-mono">
          {{ t('createdAt') }}: {{ order.created_at }}
        </div>
        <div v-if="order.processing_at" class="text-[12px] text-[#10B981] font-mono">
          {{ t('processingAt') }}: {{ order.processing_at }}
        </div>
        <div v-if="order.bot_id" class="text-[12px] text-[#F59E0B] font-mono">
          {{ t('botLabel') }}: #{{ order.bot_id }}
        </div>
        <div v-if="order.completed_at" class="text-[12px] text-[#10B981] font-mono">
          {{ t('completedAt') }}: {{ order.completed_at }}
        </div>
      </div>
    </Teleport>
  </div>
</template>
