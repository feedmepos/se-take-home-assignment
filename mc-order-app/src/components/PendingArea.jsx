import { useOrder } from '../store/OrderContext';
import OrderCard from './OrderCard';

export default function PendingArea() {
  const { state } = useOrder();
  const allPending = [...state.vipQueue, ...state.normalQueue];

  return (
    <div className="order-area">
      <h2 className="pending-header">
        PENDING <span className="badge">{allPending.length}</span>
      </h2>
      <div className="order-list">
        {allPending.length === 0 ? (
          <div className="order-empty">暂无待处理订单</div>
        ) : (
          allPending.map(order => (
            <OrderCard key={order.id} order={order} isCompleted={false} />
          ))
        )}
      </div>
    </div>
  );
}
