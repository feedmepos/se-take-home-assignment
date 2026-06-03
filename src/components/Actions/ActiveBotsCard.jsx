import robotIcon from '../../assets/png/robot-1.png';

const ActiveBotsCard = ({
	activeBotCount,
	totalBots,
	onAddBot,
	onRemoveBot,
}) => {
	return (
		<div className="stat-card stat-card--bots">
			<div className="stat-card__icon stat-card__icon--robot">
				<img src={robotIcon} alt="" />
			</div>
			<div className="stat-card__info">
				<span className="stat-card__label">Active Bots</span>
				<span className="stat-card__value">
					<span className="stat-card__value-active">
						{activeBotCount}
					</span>
					<span className="stat-card__value-of">of {totalBots}</span>
				</span>
			</div>
			<div className="stat-card__actions">
				<button
					type="button"
					className="outline-btn outline-btn--add"
					onClick={onAddBot}
				>
					+ Add Bot
				</button>
				<button
					type="button"
					className="outline-btn outline-btn--remove"
					onClick={onRemoveBot}
					disabled={totalBots === 0}
				>
					− Remove Bot
				</button>
			</div>
		</div>
	);
};

export default ActiveBotsCard;
