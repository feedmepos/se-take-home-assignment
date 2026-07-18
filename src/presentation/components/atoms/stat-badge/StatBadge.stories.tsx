import type { Meta, StoryObj } from '@storybook/react';
import { StatBadge } from './StatBadge';

const meta: Meta<typeof StatBadge> = {
  title: 'Atoms/StatBadge',
  component: StatBadge,
  tags: ['autodocs'],
  args: { label: 'Pending', value: 3 },
};

export default meta;
type Story = StoryObj<typeof StatBadge>;

export const Default: Story = {};
export const Complete: Story = { args: { label: 'Complete', value: 12 } };
