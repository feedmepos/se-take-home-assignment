/**
 * =====================================================================
 * McDonald's Order Controller — app.js
 * =====================================================================
 *
 * Architecture Overview:
 * ----------------------
 * State is held entirely in memory via the `state` object. The UI is
 * re-rendered reactively whenever state changes through `render()`.
 *
 * Key Data Structures:
 *   state.pending  — Array of Order objects (priority queue):
 *                    VIP orders are inserted before all Normal orders,
 *                    but after any existing VIP orders.
 *   state.complete — Array of Order objects in completion order.
 *   state.bots     — Array of Bot objects.
 *
 * Order Schema:
 *   { id, type: 'normal'|'vip', status: 'pending'|'processing'|'complete',
 *     createdAt, completedAt, processingBotId }
 *
 * Bot Schema:
 *   { id, status: 'idle'|'busy', currentOrderId, timer, progress }
 *
 * Priority Queue Insertion (VIP logic):
 *   When a VIP order arrives, scan pending[] from the end to find the
 *   last VIP order. Insert the new VIP order immediately after it.
 *   If no VIP exists, insert at index 0 (front of queue).
 *
 * Bot Processing Loop:
 *   Each bot runs an independent setInterval (10 000 ms). When a bot
 *   finishes, it immediately picks up the next pending order.
 *   Progress is tracked (0–100) for the progress bar display.
 *
 * Bot Removal:
 *   When a bot is removed, its in-progress order (if any) is returned
 *   to the pending queue at the correct priority position.
 * =====================================================================
 */

/* ------------------------------------------------------------------
   CONSTANTS
   ------------------------------------------------------------------ */
const PROCESS_TIME_MS = 10_000; // 10 seconds per order
const TICK_INTERVAL = 100;      // progress bar update interval (ms)

/* ------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------ */
const state = {
  nextOrderId: 1,   // auto-incrementing order number
  nextBotId: 1,     // auto-incrementing bot number
  pending: [],      // Order[]  — priority queue
  complete: [],     // Order[]  — completed orders
  bots: [],         // Bot[]
  totalOrders: 0,
  totalVip: 0,
};

/* ------------------------------------------------------------------
   HELPERS — Time
   ------------------------------------------------------------------ */
/**
 * Returns current wall-clock time as HH:MM:SS string.
 * Used for the activity log timestamp on each entry.
 */
function nowHHMMSS() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

/* ------------------------------------------------------------------
   ACTIVITY LOG
   ------------------------------------------------------------------ */
/**
 * Appends a new entry to the activity log panel.
 * @param {string} message - Human-readable description of the event.
 * @param {string} [color='dim'] - CSS class for colour: gold|green|blue|yellow|red|dim
 */
function log(message, color = 'dim') {
  const list = document.getElementById('log-list');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-ts">${nowHHMMSS()}</span><span class="log-msg ${color}">${message}</span>`;
  list.prepend(entry); // newest at top

  // Trim log to 80 entries to prevent unbounded growth
  while (list.children.length > 80) {
    list.removeChild(list.lastChild);
  }
}

document.getElementById('btn-clear-log').addEventListener('click', () => {
  document.getElementById('log-list').innerHTML = '';
  log('Log cleared.', 'dim');
});

/* ------------------------------------------------------------------
   ORDER CREATION
   ------------------------------------------------------------------ */
/**
 * Creates a new order and inserts it into the pending queue.
 *
 * Priority Insertion Rule:
 *   - Normal orders are appended to the END of the queue.
 *   - VIP orders are inserted immediately AFTER the last existing VIP
 *     order, effectively cutting in front of all Normal orders while
 *     queuing behind existing VIP orders.
 *
 * @param {'normal'|'vip'} type
 */
function createOrder(type) {
  const order = {
    id: state.nextOrderId++,
    type,
    status: 'pending',
    createdAt: new Date(),
    completedAt: null,
    processingBotId: null,
  };

  state.totalOrders++;
  if (type === 'vip') state.totalVip++;

  if (type === 'normal') {
    // Append to end of queue
    state.pending.push(order);
  } else {
    // VIP: find insertion index = index after last VIP order
    let insertAt = 0;
    for (let i = 0; i < state.pending.length; i++) {
      if (state.pending[i].type === 'vip') {
        insertAt = i + 1; // push insertion point after each existing VIP
      }
    }
    state.pending.splice(insertAt, 0, order);
  }

  const typeLabel = type === 'vip' ? '★ VIP' : 'Normal';
  log(`Order #${order.id} [${typeLabel}] added to PENDING queue.`, type === 'vip' ? 'yellow' : 'blue');

  // Attempt to assign idle bots
  dispatchIdleBots();
  render();
}

/* ------------------------------------------------------------------
   BOT MANAGEMENT
   ------------------------------------------------------------------ */
/**
 * Creates a new bot and starts it. If there are pending orders, the
 * bot immediately begins processing the first one.
 */
function addBot() {
  const bot = {
    id: state.nextBotId++,
    status: 'idle',
    currentOrderId: null,
    progressTimer: null,  // setInterval reference for progress bar
    progress: 0,          // 0–100
    processTimeout: null, // setTimeout reference for order completion
    elapsed: 0,           // ms elapsed on current order
  };
  state.bots.push(bot);
  log(`Bot #${bot.id} created and online.`, 'green');
  assignOrderToBot(bot);
  render();
}

/**
 * Removes the NEWEST IDLE bot (highest ID among idle bots).
 *
 * New rule: A bot that is currently processing an order CANNOT be
 * removed. Only idle bots are eligible for removal. If all bots are
 * busy, the action is rejected and the user is notified.
 */
function removeBot() {
  if (state.bots.length === 0) {
    log('No bots to remove.', 'red');
    return;
  }

  // Find the newest (last) idle bot — iterate from end for highest ID first
  let idleBotIndex = -1;
  for (let i = state.bots.length - 1; i >= 0; i--) {
    if (state.bots[i].status === 'idle') {
      idleBotIndex = i;
      break;
    }
  }

  // All bots are busy — reject removal
  if (idleBotIndex === -1) {
    log('Cannot remove bot — all bots are currently processing orders.', 'red');
    return;
  }

  const bot = state.bots[idleBotIndex];
  state.bots.splice(idleBotIndex, 1);

  // Idle bots have no active timers, but clear defensively
  clearInterval(bot.progressTimer);
  clearTimeout(bot.processTimeout);

  log(`Bot #${bot.id} destroyed (was idle).`, 'red');
  render();
}

/**
 * Returns an order object from the complete list or pending list by ID.
 * Used when a bot is removed mid-processing.
 * @param {number} id
 * @returns {object|null}
 */
function findOrderById(id) {
  return (
    state.pending.find(o => o.id === id) ||
    state.complete.find(o => o.id === id) ||
    null
  );
}

/**
 * Re-inserts a returned order into pending[], maintaining VIP/Normal
 * priority ordering. Mirrors the same logic as createOrder().
 * @param {object} order
 */
function reinsertIntoPending(order) {
  if (order.type === 'normal') {
    state.pending.push(order);
  } else {
    let insertAt = 0;
    for (let i = 0; i < state.pending.length; i++) {
      if (state.pending[i].type === 'vip') {
        insertAt = i + 1;
      }
    }
    state.pending.splice(insertAt, 0, order);
  }
}

/**
 * Scans all bots for idle ones and assigns them pending orders.
 * Called after every state-mutating event.
 */
function dispatchIdleBots() {
  for (const bot of state.bots) {
    if (bot.status === 'idle' && state.pending.length > 0) {
      assignOrderToBot(bot);
    }
  }
}

/**
 * Assigns the first pending order to a bot and starts the 10-second
 * processing timer plus a finer-grained progress tick.
 * @param {object} bot
 */
function assignOrderToBot(bot) {
  if (state.pending.length === 0) return; // nothing to process

  // Dequeue from front (highest priority)
  const order = state.pending.shift();
  order.status = 'processing';
  order.processingBotId = bot.id;

  bot.status = 'busy';
  bot.currentOrderId = order.id;
  bot.progress = 0;
  bot.elapsed = 0;

  const startTime = Date.now();

  log(`Bot #${bot.id} picked up Order #${order.id} [${order.type.toUpperCase()}]. Processing...`, 'green');

  // Fine-grained progress bar ticker
  bot.progressTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    bot.progress = Math.min(100, Math.round((elapsed / PROCESS_TIME_MS) * 100));
    updateBotCard(bot);
  }, TICK_INTERVAL);

  // Completion timeout (10 seconds)
  bot.processTimeout = setTimeout(() => {
    clearInterval(bot.progressTimer);
    bot.progress = 100;

    // Move order to complete
    order.status = 'complete';
    order.completedAt = new Date();
    order.processingBotId = null;
    state.complete.unshift(order); // newest at top in complete list

    // Reset bot to idle
    bot.status = 'idle';
    bot.currentOrderId = null;
    bot.progress = 0;

    log(`Order #${order.id} [${order.type.toUpperCase()}] COMPLETED by Bot #${bot.id}.`, 'gold');

    // Immediately pick up next order if available
    assignOrderToBot(bot);
    render();
  }, PROCESS_TIME_MS);

  render();
}

/* ------------------------------------------------------------------
   RENDER — Reactive UI Updates
   ------------------------------------------------------------------ */
/**
 * Full render: rebuilds the pending queue, complete queue, bot status
 * row, and all stats badges. Called after every state mutation.
 */
function render() {
  renderStats();
  renderPendingQueue();
  renderCompleteQueue();
  renderBotStatusRow();
}

/** Updates all counter badges and the header stats. */
function renderStats() {
  document.getElementById('stat-total').textContent = state.totalOrders;
  document.getElementById('stat-vip').textContent = state.totalVip;
  document.getElementById('stat-bots').textContent = state.bots.length;

  const pendingCount = state.pending.length;
  const completeCount = state.complete.length;

  document.getElementById('stat-pending').textContent = pendingCount;
  document.getElementById('stat-complete').textContent = completeCount;
  document.getElementById('bot-count-display').textContent = state.bots.length;

  document.getElementById('badge-pending').textContent = `${pendingCount} order${pendingCount !== 1 ? 's' : ''}`;
  document.getElementById('badge-complete').textContent = `${completeCount} order${completeCount !== 1 ? 's' : ''}`;
}

/**
 * Renders the PENDING queue list.
 * Orders are shown in queue order (index 0 = next to be processed).
 */
function renderPendingQueue() {
  const container = document.getElementById('queue-pending');

  // Remove existing order cards (keep the empty-state div)
  Array.from(container.querySelectorAll('.order-card')).forEach(el => el.remove());

  const empty = document.getElementById('empty-pending');

  if (state.pending.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  state.pending.forEach((order, idx) => {
    const card = buildOrderCard(order, idx + 1, false);
    container.appendChild(card);
  });
}

/**
 * Renders the COMPLETE queue list.
 * Most recently completed orders appear at the top.
 */
function renderCompleteQueue() {
  const container = document.getElementById('queue-complete');
  Array.from(container.querySelectorAll('.order-card')).forEach(el => el.remove());

  const empty = document.getElementById('empty-complete');

  if (state.complete.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  state.complete.forEach(order => {
    const card = buildOrderCard(order, null, true);
    container.appendChild(card);
  });
}

/**
 * Builds and returns a single order card DOM element.
 * @param {object} order
 * @param {number|null} position - Queue position for pending (1-indexed), null for complete.
 * @param {boolean} isComplete
 * @returns {HTMLElement}
 */
function buildOrderCard(order, position, isComplete) {
  const card = document.createElement('div');
  card.className = `order-card ${order.type}${isComplete ? ' complete' : ''}`;
  if (order.status === 'processing') card.classList.add('processing');

  const typeLabel = order.type === 'vip' ? '★ VIP' : 'NORMAL';
  const posLabel = position ? `#${position}` : '';

  let statusText;
  let statusClass = '';
  if (isComplete) {
    const completedTime = order.completedAt
      ? order.completedAt.toLocaleTimeString('en-GB', { hour12: false })
      : '--:--:--';
    statusText = `Done at ${completedTime}`;
  } else if (order.status === 'processing') {
    statusText = `Processing · Bot #${order.processingBotId}`;
    statusClass = 'processing';
  } else {
    statusText = position === 1 ? 'Next up' : `Queue pos ${posLabel}`;
  }

  const createdTime = order.createdAt.toLocaleTimeString('en-GB', { hour12: false });

  card.innerHTML = `
    <div class="order-left">
      <span class="order-type-badge ${order.type}">${typeLabel}</span>
      <span class="order-number">Order #${order.id}</span>
    </div>
    <div class="order-right">
      <span class="order-status ${statusClass}">${statusText}</span>
      <span class="order-time">Created ${createdTime}</span>
    </div>
  `;

  return card;
}

/* ------------------------------------------------------------------
   BOT STATUS ROW RENDERING
   ------------------------------------------------------------------ */

/** Maximum bot cards shown before collapsing into overflow pill. */
const BOT_VISIBLE_LIMIT = 10;

/**
 * Renders up to BOT_VISIBLE_LIMIT bot cards in the status row.
 * If there are more bots, a clickable overflow pill ("+ N more") is
 * appended. Clicking it opens a compact popover listing the hidden bots.
 */
function renderBotStatusRow() {
  const row = document.getElementById('bot-status-row');
  row.innerHTML = '';

  if (state.bots.length === 0) return;

  const visible = state.bots.slice(0, BOT_VISIBLE_LIMIT);
  const overflow = state.bots.slice(BOT_VISIBLE_LIMIT);

  visible.forEach(bot => row.appendChild(buildBotCard(bot)));

  if (overflow.length > 0) {
    row.appendChild(buildOverflowPill(overflow));
  }
}

/**
 * Builds a full-size bot status card.
 * @param {object} bot
 * @returns {HTMLElement}
 */
function buildBotCard(bot) {
  const card = document.createElement('div');
  card.className = `bot-card ${bot.status}`;
  card.id = `bot-card-${bot.id}`;

  const statusText = bot.status === 'idle'
    ? 'IDLE'
    : `Processing Order #${bot.currentOrderId}`;

  card.innerHTML = `
    <div class="bot-indicator ${bot.status}"></div>
    <div class="bot-info">
      <div class="bot-id">Bot #${bot.id}</div>
      <div class="bot-status-text">${statusText}</div>
    </div>
    <div class="bot-progress-bar" id="bot-bar-${bot.id}" style="width:${bot.progress}%"></div>
  `;

  return card;
}

/**
 * Builds the overflow pill and its popover for bots beyond the
 * visible limit. The popover lists each hidden bot as a compact card.
 * Clicking anywhere outside the popover closes it.
 *
 * @param {object[]} hiddenBots - Bots that didn't fit in the main row.
 * @returns {HTMLElement}
 */
function buildOverflowPill(hiddenBots) {
  const busyCount = hiddenBots.filter(b => b.status === 'busy').length;
  const idleCount = hiddenBots.length - busyCount;

  const pill = document.createElement('div');
  pill.className = 'bot-overflow-pill';
  pill.innerHTML = `
    <span>🤖</span>
    <span class="pill-count">+${hiddenBots.length}</span>
    <span>more&nbsp;&nbsp;<span style="font-size:9px;opacity:.6">${busyCount} busy · ${idleCount} idle</span></span>
  `;

  // Build the popover
  const popover = document.createElement('div');
  popover.className = 'bot-overflow-popover hidden';

  hiddenBots.forEach(bot => {
    const mini = document.createElement('div');
    mini.className = `bot-mini-card ${bot.status}`;
    mini.innerHTML = `
      <div class="bot-indicator ${bot.status}" style="width:6px;height:6px"></div>
      <span style="font-weight:600;color:var(--text)">Bot #${bot.id}</span>
      <span style="color:var(--text-dim)">${bot.status === 'idle' ? 'IDLE' : `→ #${bot.currentOrderId}`}</span>
    `;
    popover.appendChild(mini);
  });

  pill.appendChild(popover);

  // Toggle popover on pill click
  pill.addEventListener('click', e => {
    e.stopPropagation();
    popover.classList.toggle('hidden');
    popover.classList.toggle('visible');
  });

  // Close popover when clicking outside
  document.addEventListener('click', function closePopover() {
    popover.classList.add('hidden');
    popover.classList.remove('visible');
  }, { once: true });

  return pill;
}

/**
 * Lightweight bot card update — only updates the progress bar and
 * status text without full re-render. Called on every TICK_INTERVAL.
 * @param {object} bot
 */
function updateBotCard(bot) {
  const bar = document.getElementById(`bot-bar-${bot.id}`);
  if (bar) bar.style.width = `${bot.progress}%`;
}

/* ------------------------------------------------------------------
   CLOCK
   ------------------------------------------------------------------ */
/** Updates the system clock display every second. */
function updateClock() {
  document.getElementById('clock').textContent = nowHHMMSS();
}
setInterval(updateClock, 1000);
updateClock();

/* ------------------------------------------------------------------
   EVENT LISTENERS — Control Buttons
   ------------------------------------------------------------------ */
document.getElementById('btn-normal').addEventListener('click', () => createOrder('normal'));
document.getElementById('btn-vip').addEventListener('click', () => createOrder('vip'));
document.getElementById('btn-bot-add').addEventListener('click', addBot);

/**
 * Hold-to-rapid-remove for the "− Bot" button.
 *
 * Behaviour:
 *   - Single click  → remove one idle bot (same as before).
 *   - Hold (≥300ms) → after an initial delay, repeatedly fires removeBot
 *     every HOLD_REPEAT_MS milliseconds for as long as the button is held.
 *   - Releasing the button (mouseup / mouseleave / touchend) stops the repeat.
 *   - The button turns red while held as visual feedback.
 *
 * Constants:
 *   HOLD_DELAY_MS  — how long to hold before rapid-fire kicks in.
 *   HOLD_REPEAT_MS — interval between rapid-fire removals.
 */
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 150;

let holdDelayTimer = null;  // setTimeout — initial hold delay
let holdRepeatTimer = null; // setInterval — rapid-fire interval
let isHolding = false;

const btnRemove = document.getElementById('btn-bot-remove');

function startHold() {
  isHolding = true;
  btnRemove.classList.add('holding');

  holdDelayTimer = setTimeout(() => {
    // Rapid-fire starts after the initial delay
    holdRepeatTimer = setInterval(() => {
      removeBot();
    }, HOLD_REPEAT_MS);
  }, HOLD_DELAY_MS);
}

function stopHold() {
  if (!isHolding) return;
  isHolding = false;
  btnRemove.classList.remove('holding');
  clearTimeout(holdDelayTimer);
  clearInterval(holdRepeatTimer);
  holdDelayTimer = null;
  holdRepeatTimer = null;
}

// Mouse events (desktop)
btnRemove.addEventListener('mousedown', () => { removeBot(); startHold(); });
btnRemove.addEventListener('mouseup', stopHold);
btnRemove.addEventListener('mouseleave', stopHold);

// Touch events (mobile)
btnRemove.addEventListener('touchstart', e => { e.preventDefault(); removeBot(); startHold(); }, { passive: false });
btnRemove.addEventListener('touchend', stopHold);
btnRemove.addEventListener('touchcancel', stopHold);

/* ------------------------------------------------------------------
   INITIAL RENDER
   ------------------------------------------------------------------ */
render();
log('McDonald\'s Order Controller ready. Add bots and place orders to begin.', 'gold');
