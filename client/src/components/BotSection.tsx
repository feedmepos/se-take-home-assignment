import { Bot } from '../types';
import { BotCard } from './BotCard';

interface BotSectionProps {
  bots: Bot[];
}

export function BotSection({ bots }: BotSectionProps) {
  return (
    <div className="pt-6 border-t">
      <h3 className="mb-4 font-bold text-orange-700 text-xl">🤖 BOTS ({bots.length})</h3>
      <div className="space-y-3 max-h-40 overflow-y-auto">
        {bots.length === 0 ? (
          <p className="py-4 text-gray-500 text-center">No bots available</p>
        ) : (
          bots.map((bot) => <BotCard key={bot.id} bot={bot} />)
        )}
      </div>
    </div>
  );
}
