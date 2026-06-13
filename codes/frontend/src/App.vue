<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { api } from './api';

const state = reactive({ pending: [], complete: [], bots: [], processMs: 10000 });
const connected = ref(false);
const now = ref(Date.now());

// Track when each bot started its current order (client-side, avoids clock skew),
// keyed by botId so we can render a smooth progress bar.
const botStart = reactive({});

let source = null;
let ticker = null;

onMounted(() => {
  source = api.connect(
    (snapshot) => {
      connected.value = true;
      Object.assign(state, snapshot);
      syncBotTimers(snapshot.bots);
    },
    () => {
      connected.value = false;
    }
  );
  // Drive the progress bars.
  ticker = setInterval(() => (now.value = Date.now()), 200);
});

onUnmounted(() => {
  if (source) source.close();
  if (ticker) clearInterval(ticker);
});

// Remember/refresh the start time whenever a bot picks up a (new) order.
function syncBotTimers(bots) {
  const live = new Set();
  for (const bot of bots) {
    if (bot.status === 'PROCESSING' && bot.orderId != null) {
      const key = `${bot.id}:${bot.orderId}`;
      live.add(key);
      if (!botStart[key]) botStart[key] = Date.now();
    }
  }
  // Drop timers for orders no longer being processed.
  for (const key of Object.keys(botStart)) {
    if (!live.has(key)) delete botStart[key];
  }
}

function botProgress(bot) {
  if (bot.status !== 'PROCESSING' || bot.orderId == null) return 0;
  const start = botStart[`${bot.id}:${bot.orderId}`];
  if (!start) return 0;
  const pct = ((now.value - start) / state.processMs) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function botRemaining(bot) {
  if (bot.status !== 'PROCESSING' || bot.orderId == null) return 0;
  const start = botStart[`${bot.id}:${bot.orderId}`];
  if (!start) return 0;
  return Math.max(0, Math.ceil((state.processMs - (now.value - start)) / 1000));
}

const processSeconds = computed(() => Math.round(state.processMs / 1000));
const idleBots = computed(() => state.bots.filter((b) => b.status === 'IDLE').length);
const busyBots = computed(() => state.bots.filter((b) => b.status === 'PROCESSING').length);

async function guard(action, ok) {
  try {
    const res = await action();
    if (res && !res.ok) throw new Error(res.statusText);
    if (ok) message.success(ok);
  } catch (e) {
    message.error(`Request failed: ${e.message}. Is the backend running on ${api.base}?`);
  }
}

const newNormal = () => guard(() => api.newOrder('NORMAL'));
const newVip = () => guard(() => api.newOrder('VIP'));
const addBot = () => guard(() => api.addBot());
const removeBot = () => {
  if (state.bots.length === 0) {
    message.warning('No bots to remove.');
    return;
  }
  guard(() => api.removeBot());
};
</script>

<template>
  <a-config-provider>
    <div class="page">
      <header class="topbar">
        <div class="brand">
          <span class="logo">M</span>
          <div>
            <h1>McDonald's Order Controller</h1>
            <span class="subtitle">Automated cooking-bot order flow · {{ processSeconds }}s per order</span>
          </div>
        </div>
        <a-badge
          :status="connected ? 'success' : 'error'"
          :text="connected ? 'Connected' : `Disconnected (${api.base})`"
        />
      </header>

      <a-card class="controls" size="small">
        <a-space wrap :size="12">
          <a-button type="primary" @click="newNormal">+ New Normal Order</a-button>
          <a-button class="vip-btn" type="primary" @click="newVip">+ New VIP Order</a-button>
          <a-divider type="vertical" />
          <a-button @click="addBot">+ Bot</a-button>
          <a-button danger :disabled="state.bots.length === 0" @click="removeBot">- Bot</a-button>
          <a-divider type="vertical" />
          <a-statistic title="Bots" :value="state.bots.length" :style="{ marginRight: '16px' }" />
          <a-statistic title="Busy" :value="busyBots" :style="{ marginRight: '16px' }" />
          <a-statistic title="Idle" :value="idleBots" />
        </a-space>
      </a-card>

      <a-row :gutter="16" class="board">
        <!-- PENDING -->
        <a-col :xs="24" :md="8">
          <a-card title="PENDING" size="small" class="column pending">
            <template #extra><a-tag color="orange">{{ state.pending.length }}</a-tag></template>
            <a-empty v-if="state.pending.length === 0" description="No pending orders" />
            <transition-group name="list" tag="div">
              <div v-for="o in state.pending" :key="o.id" class="order-card">
                <span class="order-id">#{{ o.id }}</span>
                <a-tag :color="o.type === 'VIP' ? 'gold' : 'blue'">{{ o.type }}</a-tag>
              </div>
            </transition-group>
          </a-card>
        </a-col>

        <!-- BOTS -->
        <a-col :xs="24" :md="8">
          <a-card title="COOKING BOTS" size="small" class="column bots">
            <template #extra><a-tag color="purple">{{ state.bots.length }}</a-tag></template>
            <a-empty v-if="state.bots.length === 0" description="No bots — click '+ Bot'" />
            <div v-for="bot in state.bots" :key="bot.id" class="bot-card">
              <div class="bot-head">
                <span class="bot-name">🤖 Bot {{ bot.id }}</span>
                <a-tag :color="bot.status === 'PROCESSING' ? 'processing' : 'default'">
                  {{ bot.status }}
                </a-tag>
              </div>
              <div v-if="bot.status === 'PROCESSING'" class="bot-body">
                <span class="bot-order">Cooking order #{{ bot.orderId }} · {{ botRemaining(bot) }}s left</span>
                <a-progress :percent="botProgress(bot)" :show-info="false" status="active" />
              </div>
              <div v-else class="bot-body idle">Idle — waiting for orders</div>
            </div>
          </a-card>
        </a-col>

        <!-- COMPLETE -->
        <a-col :xs="24" :md="8">
          <a-card title="COMPLETE" size="small" class="column complete">
            <template #extra><a-tag color="green">{{ state.complete.length }}</a-tag></template>
            <a-empty v-if="state.complete.length === 0" description="No completed orders" />
            <transition-group name="list" tag="div">
              <div v-for="o in state.complete" :key="o.id" class="order-card done">
                <span class="order-id">#{{ o.id }}</span>
                <a-tag :color="o.type === 'VIP' ? 'gold' : 'blue'">{{ o.type }}</a-tag>
                <span class="check">✓</span>
              </div>
            </transition-group>
          </a-card>
        </a-col>
      </a-row>

      <footer class="hint">
        VIP orders jump ahead of normal orders (but queue behind earlier VIPs). Each bot cooks one
        order at a time for {{ processSeconds }}s. Removing a bot returns its order to PENDING.
      </footer>
    </div>
  </a-config-provider>
</template>

<style>
body { margin: 0; background: #f0f2f5; }
.page { max-width: 1100px; margin: 0 auto; padding: 20px; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.brand { display: flex; align-items: center; gap: 14px; }
.logo {
  width: 44px; height: 44px; border-radius: 10px; background: #ffc72c; color: #da291c;
  font-weight: 800; font-size: 28px; display: flex; align-items: center; justify-content: center;
}
.topbar h1 { margin: 0; font-size: 20px; }
.subtitle { color: #888; font-size: 12px; }
.controls { margin-bottom: 16px; }
.vip-btn { background: #d4a017; border-color: #d4a017; }
.vip-btn:hover { background: #c79513 !important; border-color: #c79513 !important; }
.board { align-items: stretch; }
.column { height: 100%; min-height: 360px; }
.column.pending { border-top: 3px solid #fa8c16; }
.column.bots { border-top: 3px solid #722ed1; }
.column.complete { border-top: 3px solid #52c41a; }
.order-card {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 8px;
  background: #fafafa; border: 1px solid #eee; border-radius: 8px;
}
.order-card.done { background: #f6ffed; border-color: #b7eb8f; }
.order-id { font-weight: 700; font-size: 15px; }
.check { margin-left: auto; color: #52c41a; font-weight: 700; }
.bot-card { padding: 12px; margin-bottom: 10px; background: #fafafa; border: 1px solid #eee; border-radius: 8px; }
.bot-head { display: flex; align-items: center; justify-content: space-between; }
.bot-name { font-weight: 600; }
.bot-body { margin-top: 8px; }
.bot-order { font-size: 12px; color: #555; }
.bot-body.idle { color: #aaa; font-size: 12px; }
.hint { margin-top: 18px; color: #999; font-size: 12px; text-align: center; }
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
