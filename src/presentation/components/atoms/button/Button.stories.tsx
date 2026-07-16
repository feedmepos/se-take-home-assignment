import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'vip', 'neutral', 'ghost'],
    },
    onClick: { action: 'clicked' },
  },
  args: {
    children: 'Button',
    variant: 'neutral',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Neutral: Story = { args: { children: 'New Normal Order' } };
export const Primary: Story = {
  args: { variant: 'primary', children: '+ Bot' },
};
export const Vip: Story = { args: { variant: 'vip', children: 'New VIP Order' } };
export const Ghost: Story = { args: { variant: 'ghost', children: '- Bot' } };
export const Disabled: Story = {
  args: { variant: 'ghost', children: '- Bot', disabled: true },
};
