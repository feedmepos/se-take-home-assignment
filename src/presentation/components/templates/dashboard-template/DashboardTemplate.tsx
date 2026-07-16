'use client';

import type { Bot, Order } from '@/domain';
import { BotShelf } from '../../organisms/bot-shelf/BotShelf';
import { ControlBar } from '../../organisms/control-bar/ControlBar';
import { OrderColumn } from '../../organisms/order-column/OrderColumn';
import {
  Columns,
  Heading,
  Logo,
  Masthead,
  Page,
  Subtitle,
  Title,
} from './DashboardTemplate.styles';

export interface DashboardTemplateProps {
  pending: readonly Order[];
  processing: readonly Order[];
  complete: readonly Order[];
  bots: readonly Bot[];
  onNewNormalOrder: () => void;
  onNewVipOrder: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

export function DashboardTemplate({
  pending,
  processing,
  complete,
  bots,
  onNewNormalOrder,
  onNewVipOrder,
  onAddBot,
  onRemoveBot,
}: DashboardTemplateProps) {
  return (
    <Page>
      <Masthead>
        <Logo aria-hidden>M</Logo>
        <Heading>
          <Title>Order Controller</Title>
          <Subtitle>
            McDonald&apos;s automated cooking-bot order management
          </Subtitle>
        </Heading>
      </Masthead>

      <ControlBar
        botCount={bots.length}
        onNewNormalOrder={onNewNormalOrder}
        onNewVipOrder={onNewVipOrder}
        onAddBot={onAddBot}
        onRemoveBot={onRemoveBot}
      />

      <Columns>
        <OrderColumn
          title="Pending"
          tone="pending"
          orders={pending}
          emptyLabel="No orders waiting. Create an order to get started."
        />
        <BotShelf bots={bots} processing={processing} />
        <OrderColumn
          title="Complete"
          tone="complete"
          orders={complete}
          emptyLabel="No orders completed yet."
        />
      </Columns>
    </Page>
  );
}
