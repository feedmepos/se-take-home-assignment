import { OrderType, type DomainEvent } from '@feedme/core';

const label = (type: OrderType | undefined): string =>
  type === OrderType.VIP ? 'VIP' : 'Normal';

/**
 * 创建一个有状态的事件渲染器,把领域事件转为人类可读的日志行。
 * 内部记忆订单类型(因为后续事件只带 orderId),供「取单/完成」行还原 Normal/VIP。
 */
export function createEventRenderer(): (event: DomainEvent, time: string) => string {
  const orderTypes = new Map<number, OrderType>();
  return (event: DomainEvent, time: string): string => {
    switch (event.kind) {
      case 'OrderCreated':
        orderTypes.set(event.order.id, event.order.type);
        return `[${time}] Created ${label(event.order.type)} Order #${event.order.id} - Status: PENDING`;
      case 'OrderPickedUp':
        return `[${time}] Bot #${event.botId} picked up ${label(orderTypes.get(event.orderId))} Order #${event.orderId} - Status: PROCESSING`;
      case 'OrderCompleted':
        return `[${time}] Bot #${event.botId} completed ${label(orderTypes.get(event.orderId))} Order #${event.orderId} - Status: COMPLETE`;
      case 'OrderRequeued':
        return `[${time}] Order #${event.orderId} returned to queue (Bot #${event.botId} removed) - Status: PENDING`;
      case 'BotAdded':
        return `[${time}] Bot #${event.botId} created - Status: ACTIVE`;
      case 'BotRemoved':
        return `[${time}] Bot #${event.botId} destroyed`;
    }
  };
}
