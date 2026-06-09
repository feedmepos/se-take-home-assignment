import { DomainEvent, Order, OrderType, StatusSnapshot } from '../domain/types';

const hms = (d: Date): string => d.toTimeString().slice(0, 8); // local HH:MM:SS

// Display label per type. NORMAL renders title-case; VIP stays an acronym —
// matching the employer's expected output (`Normal Order`, `VIP Order`).
const TYPE_LABEL: Record<OrderType, string> = { NORMAL: 'Normal', VIP: 'VIP' };
const label = (o: Order): string => `${TYPE_LABEL[o.type]} Order #${o.id}`;

function processingSeconds(o: Order): number {
  if (!o.startedAt || !o.completedAt) return 0;
  return Math.round((o.completedAt.getTime() - o.startedAt.getTime()) / 1000);
}

export function formatEvent(e: DomainEvent): string {
  const t = `[${hms(e.at)}]`;
  switch (e.type) {
    case 'OrderCreated':
      return `${t} Created ${label(e.order)} - Status: PENDING`;
    case 'OrderStarted':
      return `${t} Bot #${e.botId} picked up ${label(e.order)} - Status: PROCESSING`;
    case 'OrderCompleted':
      return `${t} Bot #${e.botId} completed ${label(e.order)} - Status: COMPLETE (Processing time: ${processingSeconds(e.order)}s)`;
    case 'OrderRequeued':
      return `${t} ${label(e.order)} returned to PENDING - Status: PENDING`;
    case 'BotAdded':
      return `${t} Bot #${e.botId} created - Status: ACTIVE`;
    case 'BotRemoved':
      return `${t} Bot #${e.botId} destroyed while ${e.wasProcessing ? 'PROCESSING' : 'IDLE'}`;
    case 'BotIdle':
      return `${t} Bot #${e.botId} is now IDLE - No pending orders`;
  }
}

/** Report header — printed once at the top of the simulation output. */
export const REPORT_HEADER = "McDonald's Order Management System - Simulation Results";

/** Init line, matching the employer sample's `System initialized with N bots`. */
export function formatInit(now: Date, botCount: number): string {
  return `[${hms(now)}] System initialized with ${botCount} bots`;
}

/** Final-status footer block, summarising the run from a snapshot. */
export function formatSummary(snap: StatusSnapshot): string {
  const all: Order[] = [...snap.pending, ...snap.processing.map((p) => p.order), ...snap.complete];
  const vip = all.filter((o) => o.type === 'VIP').length;
  const normal = all.length - vip;
  return [
    'Final Status:',
    `- Total Orders Processed: ${all.length} (${vip} VIP, ${normal} Normal)`,
    `- Orders Completed: ${snap.complete.length}`,
    `- Active Bots: ${snap.bots.length}`,
    `- Pending Orders: ${snap.pending.length}`,
  ].join('\n');
}
