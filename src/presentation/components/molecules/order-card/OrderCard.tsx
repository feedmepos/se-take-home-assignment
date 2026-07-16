import { OrderStatus, OrderType, type Order } from '@/domain';
import { Badge, type BadgeTone } from '../../atoms/badge/Badge';
import { Card, Identity, OrderNumber } from './OrderCard.styles';

const statusView: Record<OrderStatus, { tone: BadgeTone; label: string }> = {
  [OrderStatus.PENDING]: { tone: 'pending', label: 'Pending' },
  [OrderStatus.PROCESSING]: { tone: 'processing', label: 'Cooking' },
  [OrderStatus.COMPLETE]: { tone: 'complete', label: 'Complete' },
};

export interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const isVip = order.type === OrderType.VIP;
  const status = statusView[order.status];

  return (
    <Card $vip={isVip} aria-label={`Order ${order.id}, ${order.type}`}>
      <Identity>
        <OrderNumber>Order #{order.id}</OrderNumber>
        <Badge tone={isVip ? 'vip' : 'neutral'}>
          {isVip ? 'VIP' : 'Normal'}
        </Badge>
      </Identity>
      <Badge tone={status.tone}>{status.label}</Badge>
    </Card>
  );
}
