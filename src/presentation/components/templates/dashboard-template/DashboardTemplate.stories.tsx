import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BotStatus, OrderStatus, OrderType } from '@/domain';
import { DashboardTemplate } from './DashboardTemplate';

const meta: Meta<typeof DashboardTemplate> = {
  title: 'Templates/DashboardTemplate',
  component: DashboardTemplate,
  parameters: { layout: 'fullscreen' },
  args: {
    onNewNormalOrder: fn(),
    onNewVipOrder: fn(),
    onAddBot: fn(),
    onRemoveBot: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DashboardTemplate>;

export const Busy: Story = {
  args: {
    pending: [
      { id: 5, type: OrderType.NORMAL, status: OrderStatus.PENDING },
      { id: 6, type: OrderType.NORMAL, status: OrderStatus.PENDING },
    ],
    processing: [{ id: 4, type: OrderType.VIP, status: OrderStatus.PROCESSING }],
    complete: [{ id: 1, type: OrderType.VIP, status: OrderStatus.COMPLETE }],
    bots: [
      { id: 1, status: BotStatus.PROCESSING, currentOrderId: 4 },
      { id: 2, status: BotStatus.IDLE, currentOrderId: null },
    ],
  },
};

export const Empty: Story = {
  args: { pending: [], processing: [], complete: [], bots: [] },
};
