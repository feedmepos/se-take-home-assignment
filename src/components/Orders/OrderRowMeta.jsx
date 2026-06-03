import burgerIcon from '../../assets/png/burger.png';
import OrderBadge from './OrderBadge';

export default function OrderRowMeta({ order, time }) {
	return (
		<>
			<div className="order-row__left">
				<div className="order-row__badge-slot">
					<OrderBadge type={order.type} />
				</div>
				<span className="order-row__id">#{order.id}</span>
			</div>
			<div className="order-row__right">
				<img src={burgerIcon} alt="" className="order-row__burger" />
				<span className="order-row__time">{time}</span>
			</div>
		</>
	);
}
