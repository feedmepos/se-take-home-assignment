import {
  ControllerEvent,
  ORDER_TYPES,
  OrderController,
} from '../domain/order-controller';

export function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function formatEvent(event: ControllerEvent): string {
  return `[${formatTimestamp(event.at)}] ${event.message}`;
}

function collectEvents(lines: string[], controller: OrderController): void {
  for (const event of controller.drainEvents()) {
    lines.push(formatEvent(event));
  }
}

export function runDemoScenario(): string[] {
  const controller = new OrderController();
  const lines = [
    'Hermes Order Controller - Simulation Results',
    '',
  ];

  collectEvents(lines, controller);

  controller.createOrder(ORDER_TYPES.NORMAL, 1);
  collectEvents(lines, controller);

  controller.createOrder(ORDER_TYPES.VIP, 2);
  collectEvents(lines, controller);

  controller.createOrder(ORDER_TYPES.NORMAL, 2);
  collectEvents(lines, controller);

  controller.addBot(3);
  collectEvents(lines, controller);

  controller.addBot(4);
  collectEvents(lines, controller);

  controller.advanceTo(13);
  collectEvents(lines, controller);

  controller.createOrder(ORDER_TYPES.VIP, 15);
  collectEvents(lines, controller);

  controller.removeNewestBot(16);
  collectEvents(lines, controller);

  controller.addBot(17);
  collectEvents(lines, controller);

  controller.advanceTo(27);
  collectEvents(lines, controller);

  controller.removeNewestBot(28);
  collectEvents(lines, controller);

  controller.advanceTo(40);
  collectEvents(lines, controller);

  const snapshot = controller.snapshot();
  const completedVipOrders = snapshot.completedOrders.filter(
    (order) => order.type === ORDER_TYPES.VIP,
  ).length;
  const completedNormalOrders = snapshot.completedOrders.filter(
    (order) => order.type === ORDER_TYPES.NORMAL,
  ).length;

  lines.push('');
  lines.push('Final Status:');
  lines.push(`- Total Orders Processed: ${snapshot.completedOrders.length} (${completedVipOrders} VIP, ${completedNormalOrders} Normal)`);
  lines.push(`- Orders Completed: ${snapshot.completedOrders.length}`);
  lines.push(`- Active Bots: ${snapshot.bots.length}`);
  lines.push(`- Pending Orders: ${snapshot.pendingOrders.length}`);
  lines.push(`- Processing Orders: ${snapshot.processingOrders.length}`);

  return lines;
}
