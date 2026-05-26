import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order } from '../types';
import { getOrders, createOrder } from '../services/api';
import { useOrderEvents } from '../hooks/useOrderEvents';
import OrderControls from '../components/OrderControls';
import PendingColumn from '../components/PendingColumn';
import CompleteColumn from '../components/CompleteColumn';

export default function OrderListPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: orders = [], isError, error: queryError } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  useOrderEvents((event) => {
    if (event.event === 'order:completed') {
      const completed = event.payload as Order;
      queryClient.setQueryData<Order[]>(['orders'], (prev) =>
        (prev ?? []).map((o) => (o.id === completed.id ? completed : o)),
      );
    }
  });

  const pendingOrders = orders.filter((o) => o.status !== 'COMPLETE');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETE');

  if (isError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        加载订单失败: {(queryError as Error)?.message || '未知错误'}
      </div>
    );
  }

  return (
    <div>
      <OrderControls
        onNewNormal={() => createOrderMutation.mutate('NORMAL')}
        onNewVip={() => createOrderMutation.mutate('VIP')}
        disabled={createOrderMutation.isPending}
      />
      {error && (
        <div style={{ padding: '8px 16px', marginBottom: '12px', background: '#ffebee', color: '#d32f2f', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '24px' }}>
        <PendingColumn orders={pendingOrders} />
        <CompleteColumn orders={completedOrders} />
      </div>
    </div>
  );
}
