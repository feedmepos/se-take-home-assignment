import { CheckIcon } from '../../../assets/svg';
import { formatOrderTime } from '../../../utils/orderTime';
import OrderRowMeta from '../OrderRowMeta';

export default function CompletedOrderItem({ order }) {
	return (
		<li className="order-row order-row--completed">
			<div className="order-row__body order-row__body--completed">
				<OrderRowMeta
					order={order}
					time={formatOrderTime(order.completedAt ?? order.createdAt)}
				/>
			</div>
			<span className="order-row__check">
				<CheckIcon />
			</span>
		</li>
	);
}
