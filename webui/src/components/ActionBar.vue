<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useOrdersStore } from '../stores/orders'
import { useBotsStore } from '../stores/bots'
import { resetSystem } from '../api'

const { t } = useI18n()
const ordersStore = useOrdersStore()
const botsStore = useBotsStore()

async function handleReset() {
  if (!confirm(t('resetConfirm'))) return
  try {
    await resetSystem()
    ordersStore.clearAll()
    botsStore.clearAll()
  } catch (e) {
    console.error('重置失败:', e)
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3" data-testid="action-bar">
    <!-- 新建普通订单 -->
    <button
      class="btn-press px-5 py-2.5 rounded-lg font-semibold text-sm
             bg-[#DA291C] hover:bg-[#E83326] text-white
             transition-colors duration-150 shadow-lg shadow-[#DA291C]/20"
      data-testid="btn-new-normal"
      @click="ordersStore.addNormalOrder()"
    >
      {{ t('btnNormal') }}
    </button>

    <!-- 新建 VIP 订单 -->
    <button
      class="btn-press px-5 py-2.5 rounded-lg font-semibold text-sm
             bg-[#FFC72C] hover:bg-[#FFD45A] text-[#0F0F1A]
             transition-colors duration-150 shadow-lg shadow-[#FFC72C]/20"
      data-testid="btn-new-vip"
      @click="ordersStore.addVipOrder()"
    >
      {{ t('btnVip') }}
    </button>

    <!-- 分隔线 -->
    <div class="w-px h-8 bg-[#2A2A45]" />

    <!-- 添加 Bot -->
    <button
      class="btn-press px-5 py-2.5 rounded-lg font-semibold text-sm
             bg-[#1A1A2E] hover:bg-[#252540] text-[#10B981] border border-[#10B981]/30
             transition-colors duration-150"
      data-testid="btn-add-bot"
      @click="botsStore.createBot()"
    >
      {{ t('btnAddBot') }}
    </button>

    <!-- 移除 Bot -->
    <button
      class="btn-press px-5 py-2.5 rounded-lg font-semibold text-sm
             bg-[#1A1A2E] hover:bg-[#252540] text-[#EF4444] border border-[#EF4444]/30
             transition-colors duration-150"
      data-testid="btn-remove-bot"
      @click="botsStore.deleteBot()"
    >
      {{ t('btnRemoveBot') }}
    </button>

    <!-- 重置系统 -->
    <button
      class="btn-press px-5 py-2.5 rounded-lg font-semibold text-sm
             bg-[#1A1A2E] hover:bg-[#252540] text-[#F59E0B] border border-[#F59E0B]/30
             transition-colors duration-150"
      data-testid="btn-reset"
      @click="handleReset"
    >
      {{ t('btnReset') }}
    </button>
  </div>
</template>
