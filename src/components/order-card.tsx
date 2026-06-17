import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatTime } from '@/core/format';
// No domain logic — just renders the data from a snapshot order.
import type { CompleteOrder, PendingOrder, ProcessingOrder } from '@/core/types';

type OrderCardOrder = PendingOrder | ProcessingOrder | CompleteOrder;

interface OrderCardProps {
  order: OrderCardOrder;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Card
      data-testid={
        order.status === 'PENDING'
          ? 'pending-card'
          : order.status === 'COMPLETE'
            ? 'complete-card'
            : 'processing-card'
      }
    >
      <CardContent className="flex items-center justify-between gap-2 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-slate-700">#{order.id}</span>
          <Badge variant={order.type === 'VIP' ? 'vip' : 'default'}>{order.type}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {order.status === 'COMPLETE' && (
            <span className="text-xs text-slate-500 font-mono">
              {formatTime(order.completedAt)}
            </span>
          )}
          <Badge
            variant={
              order.status === 'COMPLETE'
                ? 'complete'
                : order.status === 'PROCESSING'
                  ? 'processing'
                  : 'default'
            }
          >
            {order.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
