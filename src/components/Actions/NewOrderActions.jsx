import { BagIcon, StarIcon } from '../../assets/svg';

const NewOrderActions = ({ onAddNormalOrder, onAddVipOrder }) => {
	return (
		<div className="action-bar__orders">
			<button
				type="button"
				className="action-btn action-btn--normal"
				onClick={onAddNormalOrder}
			>
				<BagIcon />
				<span>New Normal Order</span>
			</button>

			<button
				type="button"
				className="action-btn action-btn--vip"
				onClick={onAddVipOrder}
			>
				<StarIcon />
				<span>New VIP Order</span>
			</button>
		</div>
	);
};

export default NewOrderActions;
