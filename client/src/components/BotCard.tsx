import { Bot } from '../types';

interface BotCardProps {
  bot: Bot;
}

export function BotCard({ bot }: BotCardProps) {
  const statusColors = {
    IDLE: 'bg-green-100 border-green-300',
    PROCESSING: 'bg-orange-100 border-orange-300',
  };

  const statusTextColors = {
    IDLE: 'text-green-800',
    PROCESSING: 'text-orange-800',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${statusColors[bot.status]}`}>
      <div className="mb-2 font-bold text-lg">Bot #{bot.id}</div>
      <div className={`text-sm font-semibold ${statusTextColors[bot.status]}`}>
        {bot.status}
      </div>
      {bot.currentOrderId && (
        <div className="mt-2 text-gray-600 text-xs">
          Processing Order #{bot.currentOrderId}
        </div>
      )}
    </div>
  );
}
