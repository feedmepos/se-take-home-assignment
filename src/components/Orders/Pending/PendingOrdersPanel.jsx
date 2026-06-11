import { ClockIcon, InfoIcon } from '../../../assets/svg';
import PendingOrderItem from './PendingOrderItem';

export default function PendingOrdersPanel({ orders }) {
	return (
		<div className="panel panel--pending">
			<div className="panel__header">
				<div className="panel__title panel__title--red">
					<ClockIcon />
					<h2>PENDING ORDERS</h2>
				</div>
				<span className="panel__count panel__count--yellow">
					{orders.length}
				</span>
			</div>
			<p className="panel__subtitle">
				VIP orders are prioritized over Normal orders.
			</p>

			<div className="panel__body">
				{orders.length === 0 ? (
					<p className="panel__empty">No orders waiting</p>
				) : (
					<ul className="order-list">
						{orders.map((order) => (
							<PendingOrderItem key={order.id} order={order} />
						))}
					</ul>
				)}
			</div>

			<p className="panel__footer">
				<InfoIcon />
				VIP (red) orders are prioritized over Normal (yellow) orders.
			</p>
		</div>
	);
}
