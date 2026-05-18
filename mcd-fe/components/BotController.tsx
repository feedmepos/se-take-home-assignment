'use client';

import type { Bot } from '@/types/order';
import { Bot as BotComponent } from './Bot';

interface BotControllerProps {
  bots: Bot[];
  onAddBot: () => void;
  onRemoveBot: () => void;
}

export function BotController({ bots, onAddBot, onRemoveBot }: BotControllerProps) {
  return (
    <div className="border-4 border-orange-400 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Cooking Bots</h2>
        <div className="flex gap-2">
          <button
            onClick={onAddBot}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            + Bot
          </button>
          <button
            onClick={onRemoveBot}
            disabled={bots.length === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            - Bot
          </button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {bots.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No bots available</div>
        ) : (
          bots.map(bot => (
            <BotComponent key={bot.id} bot={bot} />
          ))
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Active Bots: {bots.length}
      </div>
    </div>
  );
}
