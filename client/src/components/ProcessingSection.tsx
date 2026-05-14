import { Order } from '../types';
import { Bot } from '../types';
import { OrderCard } from './OrderCard';
import { BotCard } from './BotCard';

interface ProcessingSectionProps {
  processingOrders: Order[];
  bots: Bot[];
}

export function ProcessingSection({
  processingOrders,
  bots,
}: ProcessingSectionProps) {
  return (
    <div className="flex flex-col bg-white shadow-lg p-6 rounded-lg overflow-hidden">
      {/* Processing Orders */}
      <div className="flex flex-col flex-1 mb-6 overflow-hidden">
        <h3 className="mb-4 font-bold text-blue-700 text-xl shrink-0">
          ⚙️ PROCESSING ({processingOrders.length})
        </h3>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {processingOrders.length === 0 ? (
            <p className="py-4 text-gray-500 text-center">No orders processing</p>
          ) : (
            processingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      </div>

      {/* Bots Section */}
      <div className="pt-6 border-t shrink-0">
        <h3 className="mb-4 font-bold text-orange-700 text-xl">🤖 BOTS ({bots.length})</h3>
        <div className="space-y-3 max-h-40 overflow-y-auto">
          {bots.length === 0 ? (
            <p className="py-4 text-gray-500 text-center">No bots available</p>
          ) : (
            bots.map((bot) => <BotCard key={bot.id} bot={bot} />)
          )}
        </div>
      </div>
    </div>
  );
}
