import { useOrderController } from '../hooks/useOrderController';
import ActionBar from '../components/Actions/ActionBar';
import Header from '../components/Header/Header';
import CompletedOrdersPanel from '../components/Orders/Completed/CompletedOrdersPanel';
import CookingBotsPanel from '../components/Orders/Cooking/CookingBotsPanel';
import PendingOrdersPanel from '../components/Orders/Pending/PendingOrdersPanel';
import './App.css';

const App = () => {
	const {
		bots,
		pendingOrders,
		completeOrders,
		activeBotCount,
		addNormalOrder,
		addVipOrder,
		addBot,
		removeBot,
		addFastBot,
		removeFastBot,
		getOrder,
		totalBots,
		totalNormalBots,
		totalFastBots,
	} = useOrderController();

	return (
		<div className="app">
			<Header />

			<ActionBar
				onAddNormalOrder={addNormalOrder}
				onAddVipOrder={addVipOrder}
				activeBotCount={activeBotCount}
				totalBots={totalBots}
				totalNormalBots={totalNormalBots}
				totalFastBots={totalFastBots}
				onAddBot={addBot}
				onRemoveBot={removeBot}
				onAddFastBot={addFastBot}
				onRemoveFastBot={removeFastBot}
			/>

			<section className="main-grid">
				<PendingOrdersPanel orders={pendingOrders} />
				<CookingBotsPanel bots={bots} getOrder={getOrder} />
				<CompletedOrdersPanel orders={completeOrders} />
			</section>
		</div>
	);
};

export default App;
