'use client';

import type { Bot } from '@/types/order';

interface BotProps {
  bot: Bot;
}

export function Bot({ bot }: BotProps) {
  const getStatusColor = () => {
    if (bot.status === 'PROCESSING') {
      return 'bg-green-100 border-green-300 text-green-800';
    }
    return 'bg-gray-100 border-gray-300 text-gray-600';
  };

  const getStatusText = () => {
    if (bot.status === 'PROCESSING') {
      return `Processing Order #${bot.currentOrder?.id}`;
    }
    return 'IDLE';
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${getStatusColor()} transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">Bot #{bot.id}</span>
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        <div className="w-3 h-3 rounded-full bg-current opacity-50"></div>
      </div>
    </div>
  );
}
