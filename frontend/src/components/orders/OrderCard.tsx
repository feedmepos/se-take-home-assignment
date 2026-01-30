import { Order } from '../../types/order';

type Props = {
  order: Order;
};

export const OrderCard: React.FC<Props> = ({ order }) => {
  return (
    <li className={`order ${order.type.toLowerCase()}`}>
      <b>Order #{order.id}</b> ({order.type})
      <div>Status: {order.status}</div>

      <div>
        Created at:{' '}
        {new Date(order.createdAt).toLocaleTimeString()}
      </div>

      <div>
        Processed at:{' '}
        {order.startedAt
          ? new Date(order.startedAt).toLocaleTimeString()
          : '-'}
      </div>

      <div>
        Completed at:{' '}
        {order.completedAt
          ? new Date(order.completedAt).toLocaleTimeString()
          : '-'}
      </div>
    </li>
  );
};
