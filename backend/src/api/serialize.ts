import type { Order, Bot, StatusSnapshot } from '../domain/types';
import type { OrderDTO, BotDTO, StatusDTO } from '../contracts';

export function serializeOrder(order: Order): OrderDTO {
  const dto: OrderDTO = {
    id: order.id,
    type: order.type,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };
  if (order.startedAt !== undefined) dto.startedAt = order.startedAt.toISOString();
  if (order.completedAt !== undefined) dto.completedAt = order.completedAt.toISOString();
  return dto;
}

export function serializeBot(bot: Bot): BotDTO {
  return { id: bot.id, status: bot.status, currentOrderId: bot.currentOrderId };
}

export function serializeSnapshot(snap: StatusSnapshot): StatusDTO {
  return {
    pending: snap.pending.map(serializeOrder),
    processing: snap.processing.map(({ order, botId }) => ({
      order: serializeOrder(order),
      botId,
    })),
    complete: snap.complete.map(serializeOrder),
    bots: snap.bots.map(serializeBot),
    cookDurationMs: snap.cookMs,
  };
}
