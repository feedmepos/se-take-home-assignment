import type { Meta, StoryObj } from '@storybook/react';
import { OrderStatus, OrderType } from '@/domain';
import { OrderCard } from './OrderCard';

const meta: Meta<typeof OrderCard> = {
  title: 'Molecules/OrderCard',
  component: OrderCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OrderCard>;

export const NormalPending: Story = {
  args: { order: { id: 1, type: OrderType.NORMAL, status: OrderStatus.PENDING } },
};
export const VipPending: Story = {
  args: { order: { id: 2, type: OrderType.VIP, status: OrderStatus.PENDING } },
};
export const VipCooking: Story = {
  args: {
    order: { id: 2, type: OrderType.VIP, status: OrderStatus.PROCESSING },
  },
};
export const NormalComplete: Story = {
  args: {
    order: { id: 1, type: OrderType.NORMAL, status: OrderStatus.COMPLETE },
  },
};
