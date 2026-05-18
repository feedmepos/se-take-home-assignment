'use client';

import { useOrderManager } from '@/hooks/useOrderManager';
import { OrderQueue } from '@/components/OrderQueue';
import { BotController } from '@/components/BotController';
import { OrderControls } from '@/components/OrderControls';

export default function Home() {
  const {
    pendingOrders,
    completedOrders,
    bots,
    createOrder,
    addBot,
    removeBot,
  } = useOrderManager();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          McDonald&apos;s Order Management System
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Pending Orders */}
          <OrderQueue
            title="PENDING ORDERS"
            orders={pendingOrders}
            emptyMessage="No pending orders"
            borderColor="border-yellow-400"
          />
          
          {/* Completed Orders */}
          <OrderQueue
            title="COMPLETED ORDERS"
            orders={completedOrders}
            emptyMessage="No completed orders"
            borderColor="border-green-400"
          />
          
          {/* Bot Controller */}
          <BotController
            bots={bots}
            onAddBot={addBot}
            onRemoveBot={removeBot}
          />
        </div>
        
        {/* Order Controls */}
        <OrderControls
          onCreateNormalOrder={() => createOrder('NORMAL')}
          onCreateVipOrder={() => createOrder('VIP')}
        />
      </div>
    </div>
  );
}
