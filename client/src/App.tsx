import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  clearOrders,
  clearBots,
} from './store/slices';
import { orderApi, botApi, stateApi } from './api';
import { useSSE } from './hooks';
import {
  ControlPanel,
  StatsDashboard,
  OrderSection,
  ProcessingSection,
} from './components';

function App() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((state) => state.orders.items);
  const bots = useAppSelector((state) => state.bots.items);

  // Initialize SSE connection for real-time updates
  useSSE();

  const handleCreateNormalOrder = async () => {
    try {
      await orderApi.createNormalOrder();
    } catch (error) {
      console.error('Failed to create normal order:', error);
    }
  };

  const handleCreateVipOrder = async () => {
    try {
      await orderApi.createVipOrder();
    } catch (error) {
      console.error('Failed to create VIP order:', error);
    }
  };

  const handleCreateBot = async () => {
    try {
      await botApi.createBot();
    } catch (error) {
      console.error('Failed to create bot:', error);
    }
  };

  const handleRemoveBot = async () => {
    try {
      await botApi.removeBot();
    } catch (error) {
      console.error('Failed to remove bot:', error);
    }
  };

  const handleReset = useCallback(async () => {
    try {
      await stateApi.reset();
      dispatch(clearOrders());
      dispatch(clearBots());
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  }, [dispatch]);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const processingOrders = orders.filter((o) => o.status === 'PROCESSING');
  const completeOrders = orders.filter((o) => o.status === 'COMPLETE');

  return (
    <div className="flex flex-col bg-linear-to-br from-red-50 to-yellow-50 w-screen h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        <h1 className="mb-2 font-bold text-red-700 text-4xl">
          🍔 McDonald's Order Management System
        </h1>
        <p className="text-gray-600">Automated Cooking Bot Control</p>
      </div>

      {/* Control Panel */}
      <div className="px-8 pb-4 shrink-0">
        <ControlPanel
          onCreateNormalOrder={handleCreateNormalOrder}
          onCreateVipOrder={handleCreateVipOrder}
          onCreateBot={handleCreateBot}
          onRemoveBot={handleRemoveBot}
          onReset={handleReset}
          loading={false}
        />
      </div>

      {/* Stats Dashboard */}
      <div className="px-8 pb-4 shrink-0">
        <StatsDashboard
          totalOrders={orders.length}
          activeBots={bots.length}
          pendingCount={pendingOrders.length}
          completedCount={completeOrders.length}
        />
      </div>

      {/* Main Content - Full Height */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Pending Orders */}
          <OrderSection
            title="PENDING"
            icon="📋"
            orders={pendingOrders}
            textColor="text-yellow-700"
            fullHeight
          />

          {/* Processing & Bots */}
          <ProcessingSection
            processingOrders={processingOrders}
            bots={bots}
          />

          {/* Completed Orders */}
          <OrderSection
            title="COMPLETE"
            icon="✅"
            orders={completeOrders}
            textColor="text-green-700"
            fullHeight
          />
        </div>
      </div>
    </div>
  );
}

export default App;
