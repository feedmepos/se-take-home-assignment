<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import {
  addBot,
  createNormalOrder,
  createVIPOrder,
  fetchState,
  removeBot,
} from './api.js'

const pending = ref([])
const processing = ref([])
const complete = ref([])
const bots = ref([])
const error = ref('')
let timer = null

function applyState(st) {
  pending.value = st.pending || []
  processing.value = st.processing || []
  complete.value = st.complete || []
  bots.value = st.bots || []
}

async function refresh() {
  try {
    applyState(await fetchState())
    error.value = ''
  } catch (e) {
    error.value = e.message || String(e)
  }
}

async function run(action) {
  error.value = ''
  try {
    applyState(await action())
  } catch (e) {
    error.value = e.message || String(e)
  }
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 300)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="page">
    <h1>McDonald's Order Controller</h1>

    <div class="actions">
      <button type="button" @click="run(createNormalOrder)">New Normal</button>
      <button type="button" @click="run(createVIPOrder)">New VIP</button>
      <button type="button" @click="run(addBot)">+ Bot</button>
      <button type="button" @click="run(removeBot)">- Bot</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="columns">
      <section>
        <h2>PENDING ({{ pending.length }})</h2>
        <ul>
          <li
            v-for="o in pending"
            :key="'p-' + o.id"
            :class="{ vip: o.type === 'VIP' }"
          >
            #{{ o.id }} {{ o.type }}
          </li>
        </ul>
      </section>
      <section>
        <h2>PROCESSING ({{ processing.length }})</h2>
        <ul>
          <li
            v-for="o in processing"
            :key="'x-' + o.id"
            :class="{ vip: o.type === 'VIP' }"
          >
            #{{ o.id }} {{ o.type }}
          </li>
        </ul>
      </section>
      <section>
        <h2>COMPLETE ({{ complete.length }})</h2>
        <ul>
          <li
            v-for="o in complete"
            :key="'c-' + o.id"
            :class="{ vip: o.type === 'VIP' }"
          >
            #{{ o.id }} {{ o.type }}
          </li>
        </ul>
      </section>
    </div>

    <section class="bots">
      <h2>BOTS ({{ bots.length }})</h2>
      <ul>
        <li v-for="b in bots" :key="b.id">
          Bot #{{ b.id }} {{ b.status }}
          <span v-if="b.currentOrderId != null">→ Order #{{ b.currentOrderId }}</span>
          <span v-else>→ idle</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  font-family: Georgia, 'Times New Roman', serif;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  background: linear-gradient(160deg, #fff8f0 0%, #f0f4f8 100%);
  min-height: 100vh;
  box-sizing: border-box;
}
h1 {
  font-size: 1.75rem;
  margin: 0 0 1rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
button {
  font: inherit;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  border: 1px solid #333;
  background: #fff;
}
button:hover {
  background: #ffe8cc;
}
.error {
  color: #a40000;
}
.columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 700px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
section {
  min-height: 8rem;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  padding: 0.4rem 0.6rem;
  margin-bottom: 0.35rem;
  background: #fff;
  border-left: 3px solid #666;
}
li.vip {
  border-left-color: #c45c26;
  font-weight: 700;
}
.bots {
  margin-top: 1.5rem;
}
</style>
