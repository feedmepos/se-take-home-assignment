import { useMemo } from 'react';
import type { Bot, Order } from '@/domain';
import { StatBadge } from '../../atoms/stat-badge/StatBadge';
import { BotCard } from '../../molecules/bot-card/BotCard';
import { Accent, Empty, Header, List, Shelf, Title } from './BotShelf.styles';

export interface BotShelfProps {
  bots: readonly Bot[];
  /** Orders currently being cooked, used to show each bot's order tier. */
  processing: readonly Order[];
}

/** Displays the current bot fleet and what each bot is cooking. */
export function BotShelf({ bots, processing }: BotShelfProps) {
  const ordersById = useMemo(
    () => new Map(processing.map((order) => [order.id, order])),
    [processing],
  );

  return (
    <Shelf aria-label="Cooking bots">
      <Header>
        <Title>
          <Accent aria-hidden />
          Cooking
        </Title>
        <StatBadge label="Bots" value={bots.length} />
      </Header>
      <List>
        {bots.length === 0 ? (
          <Empty>No bots running. Add a bot to start cooking orders.</Empty>
        ) : (
          bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              order={
                bot.currentOrderId === null
                  ? undefined
                  : ordersById.get(bot.currentOrderId)
              }
            />
          ))
        )}
      </List>
    </Shelf>
  );
}
