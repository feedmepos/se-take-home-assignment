import type { Meta, StoryObj } from '@storybook/react';
import { OrderStatus, OrderType } from '@/domain';
import { OrderColumn } from './OrderColumn';

const meta: Meta<typeof OrderColumn> = {
  title: 'Organisms/OrderColumn',
  component: OrderColumn,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, height: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrderColumn>;

export const Pending: Story = {
  args: {
    title: 'Pending',
    tone: 'pending',
    emptyLabel: 'No orders waiting.',
    orders: [
      { id: 2, type: OrderType.VIP, status: OrderStatus.PENDING },
      { id: 4, type: OrderType.VIP, status: OrderStatus.PENDING },
      { id: 1, type: OrderType.NORMAL, status: OrderStatus.PENDING },
      { id: 3, type: OrderType.NORMAL, status: OrderStatus.PENDING },
    ],
  },
};

export const Empty: Story = {
  args: {
    title: 'Complete',
    tone: 'complete',
    emptyLabel: 'No orders completed yet.',
    orders: [],
  },
};
