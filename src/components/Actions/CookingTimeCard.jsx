import { ClockIcon } from '../../assets/svg';
import { TOTAL_SECONDS } from '../../utils/cookingProgress';

const CookingTimeCard = () => {
	return (
		<div className="stat-card stat-card--time">
			<div className="stat-card__icon stat-card__icon--gray">
				<ClockIcon />
			</div>
			<div className="stat-card__info">
				<span className="stat-card__label">Order Cooking Time</span>
				<span className="stat-card__value">
					{TOTAL_SECONDS} seconds
				</span>
			</div>
		</div>
	);
};

export default CookingTimeCard;
