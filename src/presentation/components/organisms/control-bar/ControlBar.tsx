'use client';

import { Button } from '../../atoms/button/Button';
import {
  Actions,
  Bar,
  BotCount,
  Divider,
  Group,
  GroupLabel,
} from './ControlBar.styles';

export interface ControlBarProps {
  botCount: number;
  onNewNormalOrder: () => void;
  onNewVipOrder: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

export function ControlBar({
  botCount,
  onNewNormalOrder,
  onNewVipOrder,
  onAddBot,
  onRemoveBot,
}: ControlBarProps) {
  return (
    <Bar>
      <Group>
        <GroupLabel>New Order</GroupLabel>
        <Actions>
          <Button variant="neutral" onClick={onNewNormalOrder}>
            New Normal Order
          </Button>
          <Button variant="vip" onClick={onNewVipOrder}>
            New VIP Order
          </Button>
        </Actions>
      </Group>

      <Divider aria-hidden />

      <Group>
        <GroupLabel>Cooking Bots</GroupLabel>
        <Actions>
          <Button variant="primary" onClick={onAddBot}>
            + Bot
          </Button>
          <BotCount aria-live="polite">{botCount}</BotCount>
          <Button variant="ghost" onClick={onRemoveBot} disabled={botCount === 0}>
            - Bot
          </Button>
        </Actions>
      </Group>
    </Bar>
  );
}
