import { useOrder } from '../store/OrderContext';
import OrderCard from './OrderCard';

export default function CompleteArea() {
  const { state } = useOrder();

  return (
    <div className="order-area">
      <h2 className="complete-header">
        COMPLETE <span className="badge">{state.completedOrders.length}</span>
      </h2>
      <div className="order-list">
        {state.completedOrders.length === 0 ? (
          <div className="order-empty">暂无已完成订单</div>
        ) : (
          state.completedOrders.map(order => (
            <OrderCard key={order.id} order={order} isCompleted />
          ))
        )}
      </div>
    </div>
  );
}
