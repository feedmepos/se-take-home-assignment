import { useOrder } from '../store/OrderContext';

export default function OrderButtons() {
  const { state, createOrder } = useOrder();

  if (state.role !== 'customer') return null;

  return (
    <div className="panel-section">
      <h3>创建订单</h3>
      <button className="btn btn-normal" onClick={() => createOrder('normal')}>
        New Normal Order
      </button>
      <button className="btn btn-vip" onClick={() => createOrder('vip')}>
        New VIP Order
      </button>
    </div>
  );
}
