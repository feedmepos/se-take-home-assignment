import type { OrderStatus, BotStatus } from '@contracts';

export type AnyStatus = OrderStatus | BotStatus;

export function humanizeStatus(status: AnyStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'PROCESSING':
      return 'Processing';
    case 'COMPLETE':
      return 'Complete';
    case 'IDLE':
      return 'Idle';
  }
}
