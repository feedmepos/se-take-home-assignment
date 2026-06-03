import { CheckIcon, InfoIcon } from '../../../assets/svg';
import CompletedOrderItem from './CompletedOrderItem';

export default function CompletedOrdersPanel({ orders }) {
	return (
		<div className="panel panel--complete">
			<div className="panel__header">
				<div className="panel__title panel__title--green">
					<CheckIcon />
					<h2>COMPLETED ORDERS</h2>
				</div>
				<span className="panel__count panel__count--green">
					{orders.length}
				</span>
			</div>

			<div className="panel__body">
				{orders.length === 0 ? (
					<p className="panel__empty">No completed orders yet</p>
				) : (
					<ul className="order-list">
						{[...orders].reverse().map((order) => (
							<CompletedOrderItem key={order.id} order={order} />
						))}
					</ul>
				)}
			</div>

			<p className="panel__footer">
				<InfoIcon />
				Completed orders will appear here.
			</p>
		</div>
	);
}
