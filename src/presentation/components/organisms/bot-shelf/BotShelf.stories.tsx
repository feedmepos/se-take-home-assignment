import type { Meta, StoryObj } from '@storybook/react';
import { BotStatus, OrderStatus, OrderType } from '@/domain';
import { BotShelf } from './BotShelf';

const meta: Meta<typeof BotShelf> = {
  title: 'Organisms/BotShelf',
  component: BotShelf,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BotShelf>;

export const WithBots: Story = {
  args: {
    bots: [
      { id: 1, status: BotStatus.PROCESSING, currentOrderId: 2 },
      { id: 2, status: BotStatus.PROCESSING, currentOrderId: 1 },
      { id: 3, status: BotStatus.IDLE, currentOrderId: null },
    ],
    processing: [
      { id: 2, type: OrderType.VIP, status: OrderStatus.PROCESSING },
      { id: 1, type: OrderType.NORMAL, status: OrderStatus.PROCESSING },
    ],
  },
};

export const Empty: Story = { args: { bots: [], processing: [] } };
