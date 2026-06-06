import type { ControllerEvent, Order } from './order-controller.js';

export function timestamp(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const label = (o: Order): string => `${o.type === 'VIP' ? 'VIP' : 'Normal'} Order #${o.id}`;

export function formatEvent(event: ControllerEvent, processingSeconds = 10): string {
  switch (event.type) {
    case 'ORDER_CREATED':
      return `Created ${label(event.order)} - Status: PENDING`;
    case 'BOT_CREATED':
      return `Bot #${event.bot.id} created - Status: ACTIVE`;
    case 'BOT_PICKED':
      return `Bot #${event.bot.id} picked up ${label(event.order)} - Status: PROCESSING`;
    case 'ORDER_COMPLETED':
      return `Bot #${event.bot.id} completed ${label(event.order)} - Status: COMPLETE (Processing time: ${processingSeconds}s)`;
    case 'BOT_IDLE':
      return `Bot #${event.bot.id} is now IDLE - No pending orders`;
    case 'BOT_DESTROYED':
      return event.returnedOrder
        ? `Bot #${event.bot.id} destroyed - returned ${label(event.returnedOrder)} to PENDING`
        : `Bot #${event.bot.id} destroyed while IDLE`;
  }
}

export function createPrinter(
  out: (line: string) => void,
  processingSeconds = 10,
): (event: ControllerEvent) => void {
  return (event) => out(`[${timestamp()}] ${formatEvent(event, processingSeconds)}`);
}
