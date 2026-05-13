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
  BotSection,
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
    <div className="bg-linear-to-br from-red-50 to-yellow-50 p-8 min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-red-700 text-4xl">
            🍔 McDonald's Order Management System
          </h1>
          <p className="text-gray-600">Automated Cooking Bot Control</p>
        </div>

        {/* Control Panel */}
        <ControlPanel
          onCreateNormalOrder={handleCreateNormalOrder}
          onCreateVipOrder={handleCreateVipOrder}
          onCreateBot={handleCreateBot}
          onRemoveBot={handleRemoveBot}
          onReset={handleReset}
          loading={false}
        />

        {/* Stats Dashboard */}
        <StatsDashboard
          totalOrders={orders.length}
          activeBots={bots.length}
          pendingCount={pendingOrders.length}
          completedCount={completeOrders.length}
        />

        {/* Main Content */}
        <div className="gap-8 grid grid-cols-1 lg:grid-cols-3">
          {/* Pending Orders */}
          <OrderSection
            title="PENDING"
            icon="📋"
            orders={pendingOrders}
            textColor="text-yellow-700"
          />

          {/* Processing & Bots */}
          <div className="bg-white shadow-lg p-6 rounded-lg">
            <div className="mb-6">
              <h3 className="mb-4 font-bold text-blue-700 text-xl">
                ⚙️ PROCESSING ({processingOrders.length})
              </h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {processingOrders.length === 0 ? (
                  <p className="py-4 text-gray-500 text-center">No orders processing</p>
                ) : (
                  processingOrders.map((order) => (
                    <OrderSection
                      key={order.id}
                      title=""
                      icon=""
                      orders={[order]}
                      textColor=""
                    />
                  ))
                )}
              </div>
            </div>

            <BotSection bots={bots} />
          </div>

          {/* Completed Orders */}
          <OrderSection
            title="COMPLETE"
            icon="✅"
            orders={completeOrders}
            textColor="text-green-700"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
