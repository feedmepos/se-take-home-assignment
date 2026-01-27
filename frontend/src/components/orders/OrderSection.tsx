import { Order } from '../../models/order';
import { OrderCard } from './OrderCard';

type Props = {
    title?: string;
    orders: Order[];
    variant: 'vip' | 'normal' | 'complete';
    showProcessing?: boolean;
    emptyText: string;
};

export const OrderSection: React.FC<Props> = ({
    title,
    orders,
    variant,
    showProcessing = false,
    emptyText,
}) => (
    <>
        {title && <h3>{title}</h3>}
        {orders.length === 0 && <p className="empty">{emptyText}</p>}
        <ul>
            {orders.map(o => (
                <OrderCard
                    key={o.id}
                    order={o}
                    variant={variant}
                    showProcessing={showProcessing}
                />
            ))}
        </ul>
    </>
);
