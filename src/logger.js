'use strict';

const { getTimestamp, getDateOnly } = require('./timestamp');

// --- Event Log Functions ---

function logTimestamp() {
  return `[${getTimestamp()}]`;
}

function logOrderCreated(order) {
  return `✓ ${order.toString()} created`;
}

function logBotCreated(bot) {
  return `✓ Bot #${bot.id} created`;
}

function logBotPickup(bot, order, waitSeconds) {
  return `🤖 Bot #${bot.id} → picked up ${order.toString()} (waited ${waitSeconds}s)`;
}

function logBotCompleted(bot, order, processSeconds) {
  return `✓ Bot #${bot.id} completed ${order.toString()} (${processSeconds}s)`;
}

function logBotIdle(bot) {
  return `🤖 Bot #${bot.id} idle — no pending orders`;
}

function logBotDestroyed(bot, reason) {
  return `✗ Bot #${bot.id} destroyed (${reason})`;
}

function logOrderReturned(order, waitSeconds) {
  return `↩ ${order.toString()} returned to PENDING (waited ${waitSeconds}s)`;
}

function logQueueSnapshot(orders) {
  if (!orders || orders.length === 0) {
    return '📋 Queue: (empty)';
  }
  const items = orders.map(o => {
    return o.type === 'VIP' ? `⭐#${o.id}` : `#${o.id}`;
  });
  return `📋 Queue: ${items.join(' → ')}`;
}

// --- Rendering Functions ---

function renderHeader() {
  const date = getDateOnly();
  const lines = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│                                                                  │');
  lines.push('│  🍔  McDonald\'s Order Management System — Simulation Results     │');
  lines.push('│                                                                  │');
  lines.push(`│  Outlet : Main Street #042                                       │`);
  lines.push(`│  Date   : ${date}                                             │`);
  lines.push('│                                                                  │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');
  return lines.join('\n');
}

function renderMenu(clock) {
  const lines = [];
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│                                                                  │');
  lines.push('│          🍔  McDonald\'s Order Management System                  │');
  lines.push('│                                                                  │');
  lines.push('│          Outlet : Main Street #042                               │');
  lines.push(`│          🕐     : ${clock}                            │`);
  lines.push('│                                                                  │');
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push('│                                                                  │');
  lines.push('│          [1]  New Normal Order                                   │');
  lines.push('│          [2]  New VIP Order                                      │');
  lines.push('│          [3]  Add Bot                                            │');
  lines.push('│          [4]  Remove Bot                                         │');
  lines.push('│          [5]  Status Board                                       │');
  lines.push('│          [0]  Quit                                               │');
  lines.push('│                                                                  │');
  lines.push('│          Enter command:                                          │');
  lines.push('│                                                                  │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');
  return lines.join('\n');
}

function renderProgressBar(elapsed, total) {
  const width = 20;
  const pct = Math.min(elapsed / total, 1);
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pctStr = Math.round(pct * 100) + '%';
  return `${bar} ${pctStr}`;
}

function renderStatusBoard(state) {
  const now = new Date();
  const clock = getTimestamp();
  const lines = [];

  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push(`│  🍔 McDonald's — Main Street #042        🕐 ${clock} │`);
  lines.push('├──────────────────────────────────────────────────────────────────┤');
  lines.push('│                                                                  │');

  // Bots section
  lines.push(`│  🤖 BOTS (${state.bots.length})                                                    │`);
  if (state.bots.length === 0) {
    lines.push('│  ┌──────────────────────────────────────────────────────────────┐│');
    lines.push('│  │  No active bots                                              ││');
    lines.push('│  └──────────────────────────────────────────────────────────────┘│');
  } else {
    lines.push('│  ┌────────┬────────────┬──────────────────────────────────────┐  │');
    lines.push('│  │ Bot    │ Status     │ Details                              │  │');
    lines.push('│  ├────────┼────────────┼──────────────────────────────────────┤  │');
    state.bots.forEach((bot, idx) => {
      if (bot.status === 'PROCESSING' && bot.currentOrder) {
        const order = bot.currentOrder;
        const elapsed = Math.round((now - order.pickedUpAt) / 1000);
        const bar = renderProgressBar(elapsed, bot.processingTime / 1000);
        const orderedTime = formatTime(order.createdAt);
        const pickupTime = formatTime(order.pickedUpAt);
        lines.push(`│  │ #${String(bot.id).padEnd(5)}│ ⚙ Working  │ ${order.toString().padEnd(36)}│  │`);
        lines.push(`│  │        │            │ Ordered  : ${orderedTime}                  │  │`);
        lines.push(`│  │        │            │ Pickup   : ${pickupTime}                  │  │`);
        lines.push(`│  │        │            │ Elapsed  : ${String(elapsed) + 's'}${' '.repeat(Math.max(0, 24 - String(elapsed).length - 1))}│  │`);
        lines.push(`│  │        │            │ ${bar.padEnd(36)}│  │`);
      } else {
        const idleSince = bot.idleSince ? formatTime(bot.idleSince) : 'N/A';
        const idleDuration = bot.idleSince ? Math.round((now - bot.idleSince) / 1000) + 's' : '0s';
        lines.push(`│  │ #${String(bot.id).padEnd(5)}│ 💤 Idle    │ Since    : ${idleSince}                  │  │`);
        lines.push(`│  │        │            │ Duration : ${idleDuration.padEnd(24)}│  │`);
      }
      if (idx < state.bots.length - 1) {
        lines.push('│  ├────────┼────────────┼──────────────────────────────────────┤  │');
      }
    });
    lines.push('│  └────────┴────────────┴──────────────────────────────────────┘  │');
  }

  lines.push('│                                                                  │');

  // Pending section
  const pendingCount = state.pending.length;
  lines.push(`│  🟡 PENDING (${pendingCount})                                                 │`);
  if (pendingCount === 0) {
    lines.push('│  ┌──────────────────────────────────────────────────────────────┐│');
    lines.push('│  │  No pending orders                                          ││');
    lines.push('│  └──────────────────────────────────────────────────────────────┘│');
  } else {
    lines.push('│  ┌────────┬────────────┬─────────────┬────────────────────────┐  │');
    lines.push('│  │ Order  │ Type       │ Ordered     │ Waiting                │  │');
    lines.push('│  ├────────┼────────────┼─────────────┼────────────────────────┤  │');
    state.pending.forEach(order => {
      const typeStr = order.type === 'VIP' ? '⭐ VIP' : '  Normal';
      const ordered = formatTime(order.createdAt);
      const waiting = Math.round((now - order.createdAt) / 1000) + 's';
      lines.push(`│  │ #${String(order.id).padEnd(5)}│ ${typeStr.padEnd(10)}│ ${ordered}     │ ${waiting.padEnd(22)}│  │`);
    });
    lines.push('│  └────────┴────────────┴─────────────┴────────────────────────┘  │');
  }

  lines.push('│                                                                  │');

  // Complete section
  const completeCount = state.completed.length;
  lines.push(`│  🟢 COMPLETE (${completeCount})                                                │`);
  if (completeCount === 0) {
    lines.push('│  ┌──────────────────────────────────────────────────────────────┐│');
    lines.push('│  │  No completed orders                                        ││');
    lines.push('│  └──────────────────────────────────────────────────────────────┘│');
  } else {
    lines.push('│  ┌────────┬────────────┬─────────────┬────────────┬───────────┐  │');
    lines.push('│  │ Order  │ Type       │ Ordered     │ Completed  │ Waited    │  │');
    lines.push('│  ├────────┼────────────┼─────────────┼────────────┼───────────┤  │');
    state.completed.forEach(order => {
      const typeStr = order.type === 'VIP' ? '⭐ VIP' : '  Normal';
      const ordered = formatTime(order.createdAt);
      const completed = formatTime(order.completedAt);
      const waited = order.pickedUpAt ?
        Math.round((order.pickedUpAt - order.createdAt) / 1000) + 's' : '0s';
      lines.push(`│  │ #${String(order.id).padEnd(5)}│ ${typeStr.padEnd(10)}│ ${ordered}     │ ${completed}    │ ${waited.padEnd(9)}│  │`);
    });
    lines.push('│  └────────┴────────────┴─────────────┴────────────┴───────────┘  │');
  }

  lines.push('│                                                                  │');

  // Summary section
  const s = state.summary;
  lines.push('│  📊 SUMMARY                                                     │');
  lines.push('│  ┌──────────────────────┬─────────────────────────────────────┐  │');
  lines.push(`│  │ Total Orders         │ ${String(s.totalOrders + ` (${s.vipCount} VIP, ${s.normalCount} Normal)`).padEnd(35)}│  │`);
  lines.push(`│  │ Completed            │ ${String(s.completedCount).padEnd(35)}│  │`);
  lines.push(`│  │ Pending              │ ${String(s.pendingCount).padEnd(35)}│  │`);
  lines.push(`│  │ Processing           │ ${String(s.processingCount).padEnd(35)}│  │`);
  lines.push(`│  │ Active Bots          │ ${String(s.activeBots + ` (${s.workingBots} working, ${s.idleBots} idle)`).padEnd(35)}│  │`);
  lines.push(`│  │ Avg Wait Time        │ ${String(s.avgWaitTime + 's').padEnd(35)}│  │`);
  lines.push('│  └──────────────────────┴─────────────────────────────────────┘  │');
  lines.push('│                                                                  │');
  lines.push('│  Press any key to return to menu                                 │');
  lines.push('│                                                                  │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

function renderSummary(state) {
  const s = state.summary;
  const lines = [];
  lines.push('');
  lines.push('┌──────────────────────────────────────────────────────────────────┐');
  lines.push('│                                                                  │');
  lines.push('│  📊 FINAL SUMMARY                                               │');
  lines.push('│  ┌──────────────────────┬─────────────────────────────────────┐  │');
  lines.push(`│  │ Total Orders         │ ${String(s.totalOrders + ` (${s.vipCount} VIP, ${s.normalCount} Normal)`).padEnd(35)}│  │`);
  lines.push(`│  │ Completed            │ ${String(s.completedCount).padEnd(35)}│  │`);
  lines.push(`│  │ Pending              │ ${String(s.pendingCount).padEnd(35)}│  │`);
  lines.push(`│  │ Active Bots          │ ${String(s.activeBots).padEnd(35)}│  │`);
  lines.push(`│  │ Avg Wait Time        │ ${String(s.avgWaitTime + 's').padEnd(35)}│  │`);
  lines.push(`│  │ Avg Process Time     │ ${String('10s').padEnd(35)}│  │`);
  lines.push('│  └──────────────────────┴─────────────────────────────────────┘  │');
  lines.push('│                                                                  │');
  lines.push('│  ✓ All orders processed successfully.                            │');
  lines.push('│                                                                  │');
  lines.push('└──────────────────────────────────────────────────────────────────┘');
  return lines.join('\n');
}

function formatTime(date) {
  if (!date) return 'N/A';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

module.exports = {
  logTimestamp,
  logOrderCreated,
  logBotCreated,
  logBotPickup,
  logBotCompleted,
  logBotIdle,
  logBotDestroyed,
  logOrderReturned,
  logQueueSnapshot,
  renderHeader,
  renderMenu,
  renderStatusBoard,
  renderSummary,
  renderProgressBar,
  formatTime
};
