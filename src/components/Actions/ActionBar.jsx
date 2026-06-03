import ActiveBotsCard from './ActiveBotsCard';
import CookingTimeCard from './CookingTimeCard';
import NewOrderActions from './NewOrderActions';

const ActionBar = ({
	onAddNormalOrder,
	onAddVipOrder,
	activeBotCount,
	totalBots,
	onAddBot,
	onRemoveBot,
}) => {
	return (
		<section className="action-bar">
			<NewOrderActions
				onAddNormalOrder={onAddNormalOrder}
				onAddVipOrder={onAddVipOrder}
			/>
			<ActiveBotsCard
				activeBotCount={activeBotCount}
				totalBots={totalBots}
				onAddBot={onAddBot}
				onRemoveBot={onRemoveBot}
			/>
			<CookingTimeCard />
		</section>
	);
};

export default ActionBar;
