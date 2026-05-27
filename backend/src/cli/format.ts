import { DomainEvent } from '../domain/types';

const hms = (d: Date): string => d.toTimeString().slice(0, 8); // local HH:MM:SS

export function formatEvent(e: DomainEvent): string {
  const t = `[${hms(e.at)}]`;
  switch (e.type) {
    case 'OrderCreated':
      return `${t} Created ${e.order.type} Order #${e.order.id} - Status: PENDING`;
    case 'OrderStarted':
      return `${t} Bot #${e.botId} picked up Order #${e.orderId} - Status: PROCESSING`;
    case 'OrderCompleted':
      return `${t} Bot #${e.botId} completed Order #${e.orderId} - Status: COMPLETE`;
    case 'OrderRequeued':
      return `${t} Bot #${e.botId} removed mid-process; Order #${e.orderId} returned to PENDING`;
    case 'BotAdded':
      return `${t} Bot #${e.botId} created`;
    case 'BotRemoved':
      return `${t} Bot #${e.botId} destroyed`;
    case 'BotIdle':
      return `${t} Bot #${e.botId} is now IDLE`;
  }
}
