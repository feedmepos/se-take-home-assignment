<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useOrdersStore } from '../stores/orders'
import OrderCard from './OrderCard.vue'

const { t } = useI18n()
const ordersStore = useOrdersStore()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0" data-testid="kanban-board">
    <!-- 待处理列 -->
    <div
      class="flex flex-col rounded-xl bg-[#1A1A2E]/60 border border-[#2A2A45] overflow-hidden"
      data-testid="column-pending"
    >
      <div class="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A45]">
        <span class="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
        <h2 class="font-semibold text-sm text-[#E8E8ED]">{{ t('colPending') }}</h2>
        <span class="ml-auto text-xs font-mono text-[#8888A0] bg-[#6366F1]/15 px-2 py-0.5 rounded-full">
          {{ ordersStore.pendingOrders.length }}
        </span>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <TransitionGroup name="list" tag="div" class="flex flex-wrap gap-1.5">
          <OrderCard
            v-for="order in ordersStore.pendingOrders"
            :key="order.id"
            :order="order"
          />
        </TransitionGroup>
        <div
          v-if="ordersStore.pendingOrders.length === 0"
          class="flex items-center justify-center h-24 text-[#8888A0] text-sm"
        >
          {{ t('emptyPending') }}
        </div>
      </div>
    </div>

    <!-- 处理中列 -->
    <div
      class="flex flex-col rounded-xl bg-[#1A1A2E]/60 border border-[#2A2A45] overflow-hidden"
      data-testid="column-processing"
    >
      <div class="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A45]">
        <span class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
        <h2 class="font-semibold text-sm text-[#E8E8ED]">{{ t('colProcessing') }}</h2>
        <span class="ml-auto text-xs font-mono text-[#8888A0] bg-[#F59E0B]/15 px-2 py-0.5 rounded-full">
          {{ ordersStore.processingOrders.length }}
        </span>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <TransitionGroup name="list" tag="div" class="flex flex-wrap gap-1.5">
          <OrderCard
            v-for="order in ordersStore.processingOrders"
            :key="order.id"
            :order="order"
          />
        </TransitionGroup>
        <div
          v-if="ordersStore.processingOrders.length === 0"
          class="flex items-center justify-center h-24 text-[#8888A0] text-sm"
        >
          {{ t('emptyProcessing') }}
        </div>
      </div>
    </div>

    <!-- 已完成列 -->
    <div
      class="flex flex-col rounded-xl bg-[#1A1A2E]/60 border border-[#2A2A45] overflow-hidden"
      data-testid="column-complete"
    >
      <div class="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A45]">
        <span class="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
        <h2 class="font-semibold text-sm text-[#E8E8ED]">{{ t('colComplete') }}</h2>
        <span class="ml-auto text-xs font-mono text-[#8888A0] bg-[#10B981]/15 px-2 py-0.5 rounded-full">
          {{ ordersStore.completeOrders.length }}
        </span>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <TransitionGroup name="list" tag="div" class="flex flex-wrap gap-1.5">
          <OrderCard
            v-for="order in ordersStore.completeOrders"
            :key="order.id"
            :order="order"
          />
        </TransitionGroup>
        <div
          v-if="ordersStore.completeOrders.length === 0"
          class="flex items-center justify-center h-24 text-[#8888A0] text-sm"
        >
          {{ t('emptyComplete') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.list-move {
  transition: transform 0.3s ease;
}
</style>
