import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: [
        'neutral',
        'vip',
        'pending',
        'processing',
        'complete',
        'idle',
        'active',
      ],
    },
  },
  args: { children: 'VIP', tone: 'vip' },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Vip: Story = { args: { tone: 'vip', children: 'VIP' } };
export const Normal: Story = { args: { tone: 'neutral', children: 'Normal' } };
export const Pending: Story = { args: { tone: 'pending', children: 'Pending' } };
export const Processing: Story = {
  args: { tone: 'processing', children: 'Cooking' },
};
export const Complete: Story = {
  args: { tone: 'complete', children: 'Complete' },
};
