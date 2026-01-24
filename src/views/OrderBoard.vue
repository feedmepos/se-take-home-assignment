<script setup lang="ts">
  import { useOrderStore } from '../stores/orderStore'
  import { PlusIcon, MinusIcon, UserIcon, StarIcon } from '@heroicons/vue/24/solid'
  import { CpuChipIcon } from '@heroicons/vue/24/outline'

  const store = useOrderStore()

  function getProcessingBot(orderId: number) {
    return store.bots.find((b) => b.currentOrderId === orderId)
  }
</script>

<template>
  <div class="min-h-screen bg-mcd-dark">
    <!-- Header -->
    <header class="bg-mcd-red py-4 px-4 shadow-lg sticky top-0 z-50">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-mcd-yellow rounded-full flex items-center justify-center">
            <span class="text-mcd-red font-black text-xl">M</span>
          </div>
          <h1 class="text-xl md:text-2xl font-black text-white tracking-tight">
            McDonald's Kitchen
          </h1>
        </div>
        <div class="text-mcd-yellow text-sm font-semibold">Order Management</div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto p-4 space-y-6">
      <!-- Control Panel -->
      <section class="bg-mcd-surface rounded-2xl p-4 md:p-6 shadow-xl border border-mcd-border">
        <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span class="w-2 h-2 bg-mcd-yellow rounded-full"></span>
          Control Panel
        </h2>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <!-- New Normal Order -->
          <button
            @click="store.addOrder(false)"
            class="group flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <UserIcon class="w-6 h-6" />
            <span class="text-sm font-semibold text-center">New Normal Order</span>
          </button>

          <!-- New VIP Order -->
          <button
            @click="store.addOrder(true)"
            class="group flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <StarIcon class="w-6 h-6" />
            <span class="text-sm font-semibold text-center">New VIP Order</span>
          </button>

          <!-- Add Bot -->
          <button
            @click="store.addBot()"
            class="group flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <div class="flex items-center gap-1">
              <PlusIcon class="w-4 h-4" />
              <CpuChipIcon class="w-6 h-6" />
            </div>
            <span class="text-sm font-semibold text-center">+ Bot</span>
          </button>

          <!-- Remove Bot -->
          <button
            @click="store.removeBot()"
            :disabled="store.bots.length === 0"
            class="group flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-lg"
          >
            <div class="flex items-center gap-1">
              <MinusIcon class="w-4 h-4" />
              <CpuChipIcon class="w-6 h-6" />
            </div>
            <span class="text-sm font-semibold text-center">- Bot</span>
          </button>
        </div>
      </section>

      <!-- Bot Status -->
      <section class="bg-mcd-surface rounded-2xl p-4 md:p-6 shadow-xl border border-mcd-border">
        <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CpuChipIcon class="w-5 h-5 text-mcd-yellow" />
          Cooking Bots
          <span class="ml-auto text-sm font-normal text-gray-400">
            {{ store.bots.length }} active
          </span>
        </h2>

        <div v-if="store.bots.length === 0" class="text-center py-8 text-gray-500">
          <CpuChipIcon class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No bots available. Click "+ Bot" to add one.</p>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div
            v-for="bot in store.bots"
            :key="bot.id"
            class="relative bg-mcd-dark rounded-xl p-3 border transition-all duration-300"
            :class="
              bot.status === 'processing'
                ? 'border-mcd-yellow shadow-lg shadow-mcd-yellow/20'
                : 'border-mcd-border'
            "
          >
            <div class="flex flex-col items-center gap-2">
              <CpuChipIcon
                class="w-8 h-8 transition-colors"
                :class="bot.status === 'processing' ? 'text-mcd-yellow' : 'text-gray-500'"
              />
              <span class="text-xs font-semibold text-gray-300">Bot #{{ bot.id }}</span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
                :class="
                  bot.status === 'processing'
                    ? 'bg-mcd-yellow/20 text-mcd-yellow'
                    : 'bg-gray-700 text-gray-400'
                "
              >
                {{ bot.status }}
              </span>
              <span v-if="bot.currentOrderId" class="text-[10px] text-gray-500">
                Order #{{ bot.currentOrderId }}
              </span>
            </div>

            <!-- Processing animation -->
            <div
              v-if="bot.status === 'processing'"
              class="absolute inset-0 rounded-xl border-2 border-mcd-yellow animate-pulse pointer-events-none"
            ></div>
          </div>
        </div>
      </section>

      <!-- Order Boards -->
      <div class="grid md:grid-cols-2 gap-4 md:gap-6">
        <!-- Pending Orders -->
        <section class="bg-mcd-surface rounded-2xl p-4 md:p-6 shadow-xl border border-mcd-border">
          <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
            PENDING
            <span
              class="ml-auto bg-orange-500/20 text-orange-400 text-sm px-3 py-1 rounded-full font-semibold"
            >
              {{ store.pendingOrders.length + store.processingOrders.length }}
            </span>
          </h2>

          <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            <!-- Processing Orders -->
            <TransitionGroup name="order">
              <div
                v-for="order in store.processingOrders"
                :key="'processing-' + order.id"
                class="order-card processing"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="order-number">{{ order.id }}</span>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-white font-semibold">Order #{{ order.id }}</span>
                        <span v-if="order.isVip" class="vip-badge">
                          <StarIcon class="w-3 h-3" />
                          VIP
                        </span>
                      </div>
                      <div class="text-xs text-mcd-yellow flex items-center gap-1 mt-0.5">
                        <CpuChipIcon class="w-3 h-3" />
                        Processing by Bot #{{ getProcessingBot(order.id)?.id }}
                      </div>
                    </div>
                  </div>
                  <div class="cooking-animation">
                    <div class="cooking-dot"></div>
                    <div class="cooking-dot"></div>
                    <div class="cooking-dot"></div>
                  </div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>
            </TransitionGroup>

            <!-- Pending Orders -->
            <TransitionGroup name="order">
              <div
                v-for="order in store.pendingOrders"
                :key="'pending-' + order.id"
                class="order-card pending"
              >
                <div class="flex items-center gap-3">
                  <span class="order-number">{{ order.id }}</span>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-white font-semibold">Order #{{ order.id }}</span>
                      <span v-if="order.isVip" class="vip-badge">
                        <StarIcon class="w-3 h-3" />
                        VIP
                      </span>
                    </div>
                    <span class="text-xs text-gray-500">Waiting...</span>
                  </div>
                </div>
              </div>
            </TransitionGroup>

            <div
              v-if="store.pendingOrders.length === 0 && store.processingOrders.length === 0"
              class="text-center py-8 text-gray-500"
            >
              <p>No pending orders</p>
            </div>
          </div>
        </section>

        <!-- Completed Orders -->
        <section class="bg-mcd-surface rounded-2xl p-4 md:p-6 shadow-xl border border-mcd-border">
          <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="w-3 h-3 bg-emerald-500 rounded-full"></span>
            COMPLETE
            <span
              class="ml-auto bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1 rounded-full font-semibold"
            >
              {{ store.completedOrders.length }}
            </span>
          </h2>

          <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            <TransitionGroup name="order">
              <div
                v-for="order in store.completedOrders"
                :key="'complete-' + order.id"
                class="order-card completed"
              >
                <div class="flex items-center gap-3">
                  <span class="order-number completed">{{ order.id }}</span>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-white font-semibold">Order #{{ order.id }}</span>
                      <span v-if="order.isVip" class="vip-badge">
                        <StarIcon class="w-3 h-3" />
                        VIP
                      </span>
                    </div>
                    <span class="text-xs text-emerald-500">Ready for pickup!</span>
                  </div>
                </div>
                <div class="text-emerald-500">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </TransitionGroup>

            <div v-if="store.completedOrders.length === 0" class="text-center py-8 text-gray-500">
              <p>No completed orders yet</p>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="text-center py-6 text-gray-600 text-sm">McDonald's Order Management Demo</footer>
  </div>
</template>

<style scoped>
  @reference "../style.css";

  /* Order card styles */
  .order-card {
    @apply flex items-center justify-between p-3 rounded-xl transition-all duration-300;
  }

  .order-card.pending {
    @apply bg-mcd-dark border border-mcd-border;
  }

  .order-card.processing {
    @apply bg-gradient-to-r from-mcd-yellow/10 to-orange-500/10 border border-mcd-yellow/30;
  }

  .order-card.completed {
    @apply bg-emerald-500/10 border border-emerald-500/30;
  }

  .order-number {
    @apply w-10 h-10 rounded-full bg-mcd-dark border border-mcd-border flex items-center justify-center text-sm font-bold text-gray-300;
  }

  .order-number.completed {
    @apply bg-emerald-500/20 border-emerald-500/30 text-emerald-400;
  }

  .vip-badge {
    @apply flex items-center gap-1 bg-mcd-yellow/20 text-mcd-yellow text-[10px] px-2 py-0.5 rounded-full font-bold uppercase;
  }

  /* Processing progress bar */
  .progress-bar {
    @apply absolute bottom-0 left-0 right-0 h-1 bg-mcd-dark/50 rounded-b-xl overflow-hidden;
  }

  .progress-fill {
    @apply h-full bg-mcd-yellow rounded-full;
    animation: progress 10s linear forwards;
  }

  @keyframes progress {
    from {
      width: 0%;
    }
    to {
      width: 100%;
    }
  }

  /* Cooking animation */
  .cooking-animation {
    @apply flex gap-1;
  }

  .cooking-dot {
    @apply w-2 h-2 bg-mcd-yellow rounded-full;
    animation: cooking 1.4s ease-in-out infinite;
  }

  .cooking-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .cooking-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes cooking {
    0%,
    80%,
    100% {
      transform: scale(0.6);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Order transitions */
  .order-enter-active,
  .order-leave-active {
    transition: all 0.4s ease;
  }

  .order-enter-from {
    opacity: 0;
    transform: translateX(-20px);
  }

  .order-leave-to {
    opacity: 0;
    transform: translateX(20px);
  }

  .order-move {
    transition: transform 0.4s ease;
  }

  /* Processing card needs relative for progress bar */
  .order-card.processing {
    @apply relative overflow-hidden;
  }
</style>
