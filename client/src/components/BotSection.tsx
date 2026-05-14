import { Bot } from '../types';
import { BotCard } from './BotCard';

interface BotSectionProps {
  bots: Bot[];
  fullHeight?: boolean;
}

export function BotSection({ bots, fullHeight = false }: BotSectionProps) {
  return (
    <div className={`${fullHeight ? 'flex-1 flex flex-col overflow-hidden' : ''}`}>
      <h3 className="mb-4 font-bold text-orange-700 text-xl shrink-0">🤖 BOTS ({bots.length})</h3>
      <div className={`space-y-3 ${fullHeight ? 'flex-1 overflow-y-auto' : 'max-h-40 overflow-y-auto'}`}>
        {bots.length === 0 ? (
          <p className="py-4 text-gray-500 text-center">No bots available</p>
        ) : (
          bots.map((bot) => <BotCard key={bot.id} bot={bot} />)
        )}
      </div>
    </div>
  );
}
