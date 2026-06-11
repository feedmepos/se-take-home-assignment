import ActiveBotsCard from './ActiveBotsCard';
import CookingTimeCard from './CookingTimeCard';
import NewOrderActions from './NewOrderActions';

const ActionBar = ({
	onAddNormalOrder,
	onAddVipOrder,
	activeBotCount,
	totalBots,
	totalNormalBots,
	totalFastBots,
	onAddBot,
	onRemoveBot,
	onAddFastBot,
	onRemoveFastBot,
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
				totalNormalBots={totalNormalBots}
				totalFastBots={totalFastBots}
				onAddBot={onAddBot}
				onRemoveBot={onRemoveBot}
				onAddFastBot={onAddFastBot}
				onRemoveFastBot={onRemoveFastBot}
			/>
			<CookingTimeCard />
		</section>
	);
};

export default ActionBar;
