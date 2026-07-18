import type { Meta, StoryObj } from '@storybook/react';
import { BotStatus, OrderStatus, OrderType } from '@/domain';
import { BotCard } from './BotCard';

const meta: Meta<typeof BotCard> = {
  title: 'Molecules/BotCard',
  component: BotCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BotCard>;

export const Idle: Story = {
  args: { bot: { id: 1, status: BotStatus.IDLE, currentOrderId: null } },
};
export const CookingNormal: Story = {
  args: {
    bot: { id: 2, status: BotStatus.PROCESSING, currentOrderId: 7 },
    order: { id: 7, type: OrderType.NORMAL, status: OrderStatus.PROCESSING },
  },
};

export const CookingVip: Story = {
  args: {
    bot: { id: 3, status: BotStatus.PROCESSING, currentOrderId: 8 },
    order: { id: 8, type: OrderType.VIP, status: OrderStatus.PROCESSING },
  },
};
