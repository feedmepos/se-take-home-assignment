import type { Order } from '@/domain';
import { StatBadge } from '../../atoms/stat-badge/StatBadge';
import { OrderCard } from '../../molecules/order-card/OrderCard';
import {
  Accent,
  Column,
  Empty,
  Header,
  List,
  Title,
} from './OrderColumn.styles';

export interface OrderColumnProps {
  title: string;
  tone: 'pending' | 'complete';
  orders: readonly Order[];
  emptyLabel: string;
}

/**
 * A titled column of orders — reused for both the PENDING and COMPLETE areas.
 * Renders a composed empty state when there is nothing to show.
 */
export function OrderColumn({
  title,
  tone,
  orders,
  emptyLabel,
}: OrderColumnProps) {
  return (
    <Column aria-label={title}>
      <Header $tone={tone}>
        <Title>
          <Accent $tone={tone} aria-hidden />
          {title}
        </Title>
        <StatBadge label="Orders" value={orders.length} />
      </Header>
      <List>
        {orders.length === 0 ? (
          <Empty>{emptyLabel}</Empty>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </List>
    </Column>
  );
}
