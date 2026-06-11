import { formatOrderTime } from '../../../utils/orderTime';
import OrderRowMeta from '../OrderRowMeta';

export default function PendingOrderItem({ order }) {
	return (
		<li className={`order-row order-row--${order.type}`}>
			<div className="order-row__stripe" />
			<div className="order-row__body">
				<OrderRowMeta
					order={order}
					time={formatOrderTime(order.createdAt)}
				/>
			</div>
		</li>
	);
}
