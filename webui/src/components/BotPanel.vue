<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBotsStore } from '../stores/bots'
import type { Bot } from '../types'

const { t } = useI18n()
const botsStore = useBotsStore()

/** 空闲 Bot 按编号升序（兼容 number 和 string 类型） */
const sortedIdle = computed(() =>
  [...botsStore.idleBots].sort((a, b) => Number(a.bot_id) - Number(b.bot_id)),
)

/** 工作中 Bot 按编号升序 */
const sortedBusy = computed(() =>
  [...botsStore.busyBots].sort((a, b) => Number(a.bot_id) - Number(b.bot_id)),
)

/** 从 bot_id 提取编号用于显示 */
function shortBotId(botId: string): string {
  return botId.length > 8 ? `#${botId.slice(0, 8)}` : `#${botId}`
}

/** 悬浮 tooltip */
const showTooltip = ref(false)
const tooltipStyle = ref<Record<string, string>>({})
const tooltipBot = ref<Bot | null>(null)
const tooltipStatus = ref('')

function onBotEnter(event: MouseEvent, bot: Bot, status: string) {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const tipW = 150
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
  tooltipBot.value = bot
  tooltipStatus.value = status
  showTooltip.value = true
}

function onBotLeave() {
  showTooltip.value = false
}
</script>

<template>
  <div
    class="rounded-xl bg-[#1A1A2E]/60 border border-[#2A2A45] p-4"
    data-testid="bot-panel"
  >
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-sm text-[#E8E8ED] flex items-center gap-2">
        <span class="text-base">&#9881;</span>
        {{ t('botPanelTitle') }}
      </h2>
      <span class="text-xs font-mono text-[#8888A0]">
        {{ t('botTotal') }}: {{ botsStore.bots.length }}
      </span>
    </div>

    <!-- 两个队列并排 -->
    <div class="flex gap-3">
      <!-- 空闲队列（左） -->
      <div class="flex-1 min-w-0" data-testid="bot-idle-queue">
        <div class="flex items-center gap-1.5 mb-2 px-1">
          <span class="w-2 h-2 rounded-full bg-[#10B981]" />
          <span class="text-xs font-medium text-[#10B981]">{{ t('botIdle') }}</span>
          <span class="text-[10px] font-mono text-[#8888A0] queue-count">({{ sortedIdle.length }})</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="bot in sortedIdle"
            :key="bot.bot_id"
            class="bot-item flex flex-col items-center justify-center rounded-lg bg-[#10B981]/5 border border-[#10B981]/20 px-2 py-2"
            :data-testid="`bot-item-${bot.bot_id}`"
            @mouseenter="(e) => onBotEnter(e, bot, 'idle')"
            @mouseleave="onBotLeave"
          >
            <!-- 机器人图标 -->
            <svg class="w-8 h-8 text-[#10B981] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="10" width="12" height="9" rx="2" />
              <circle cx="12" cy="6" r="3" />
              <line x1="9" y1="14" x2="9" y2="14.01" />
              <line x1="15" y1="14" x2="15" y2="14.01" />
              <line x1="8" y1="19" x2="6" y2="22" />
              <line x1="16" y1="19" x2="18" y2="22" />
            </svg>
            <span class="bot-id text-[12px] font-mono text-[#E8E8ED]">{{ shortBotId(bot.bot_id) }}</span>
            <span v-if="bot.created_at" class="text-[10px] font-mono text-[#8888A0]">{{ bot.created_at }}</span>
          </div>

          <div
            v-if="sortedIdle.length === 0"
            class="text-center py-3 text-[#8888A0] text-[10px]"
          >
            -
          </div>
        </div>
      </div>

      <!-- 工作中队列（右） -->
      <div class="flex-1 min-w-0" data-testid="bot-busy-queue">
        <div class="flex items-center gap-1.5 mb-2 px-1">
          <span class="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span class="text-xs font-medium text-[#F59E0B]">{{ t('botBusy') }}</span>
          <span class="text-[10px] font-mono text-[#8888A0]">({{ sortedBusy.length }})</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="bot in sortedBusy"
            :key="bot.bot_id"
            class="bot-item flex flex-col items-center justify-center rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/20 px-2 py-2 animate-pulse"
            :data-testid="`bot-item-${bot.bot_id}`"
            @mouseenter="(e) => onBotEnter(e, bot, 'busy')"
            @mouseleave="onBotLeave"
          >
            <!-- 机器人图标 -->
            <svg class="w-8 h-8 text-[#F59E0B] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="6" y="10" width="12" height="9" rx="2" />
              <circle cx="12" cy="6" r="3" />
              <line x1="9" y1="14" x2="9" y2="14.01" />
              <line x1="15" y1="14" x2="15" y2="14.01" />
              <line x1="8" y1="19" x2="6" y2="22" />
              <line x1="16" y1="19" x2="18" y2="22" />
            </svg>
            <span class="bot-id text-[12px] font-mono text-[#E8E8ED]">{{ shortBotId(bot.bot_id) }}</span>
            <span v-if="bot.created_at" class="text-[10px] font-mono text-[#8888A0]">{{ bot.created_at }}</span>
          </div>

          <div
            v-if="sortedBusy.length === 0"
            class="text-center py-3 text-[#8888A0] text-[10px]"
          >
            -
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="botsStore.bots.length === 0"
      class="text-center py-6 text-[#8888A0] text-xs"
    >
      {{ t('botEmpty') }}
    </div>

    <!-- 悬浮详情面板（Teleport 到 body） -->
    <Teleport to="body">
      <div
        v-if="showTooltip && tooltipBot"
        :style="tooltipStyle"
        class="bg-[#0F0F1A] border border-[#2A2A45] rounded-lg p-2 shadow-xl
               min-w-[150px] text-left pointer-events-none"
      >
        <div class="text-[13px] font-mono text-[#E8E8ED] font-bold mb-1">{{ shortBotId(tooltipBot.bot_id) }}</div>
        <div v-if="tooltipStatus === 'idle'" class="text-[12px] text-[#10B981] font-mono">{{ t('botIdle') }}</div>
        <div v-else class="text-[12px] text-[#F59E0B] font-mono">{{ t('botBusy') }}</div>
        <div v-if="tooltipBot.processing_order_id" class="text-[12px] text-[#8B8BF5] font-mono">{{ t('botLabel') }}: #{{ tooltipBot.processing_order_id }}</div>
        <div v-if="tooltipBot.created_at" class="text-[12px] text-[#8888A0] font-mono">{{ t('createdAt') }}: {{ tooltipBot.created_at }}</div>
      </div>
    </Teleport>
  </div>
</template>
