import { Order } from '../../models/order';

type Props = {
    order: Order;
    showProcessing: boolean;
    variant: 'vip' | 'normal' | 'complete';
};

export const OrderCard: React.FC<Props> = ({ order, showProcessing, variant }) => (
    <li className={`order ${variant}`}>
        <div><b>Order</b> #{order.id} {variant === 'complete' && `(${order.type})`}</div>
        <div><b>Status:</b> {order.status}</div>
        <div><b>Created:</b> {order.createdAt.toLocaleTimeString()}</div>
        <div>
            <b>Processing:</b>{' '}
            {showProcessing && order.processingAt
                ? order.processingAt.toLocaleTimeString()
                : '-'}
        </div>
        <div>
            <b>Completed:</b>{' '}
            {variant === 'complete' && order.completedAt
                ? order.completedAt.toLocaleTimeString()
                : '-'}
        </div>
    </li>
);
