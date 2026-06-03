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
		getOrder,
		totalBots,
	} = useOrderController();

	return (
		<div className="app">
			<Header />

			<ActionBar
				onAddNormalOrder={addNormalOrder}
				onAddVipOrder={addVipOrder}
				activeBotCount={activeBotCount}
				totalBots={totalBots}
				onAddBot={addBot}
				onRemoveBot={removeBot}
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
