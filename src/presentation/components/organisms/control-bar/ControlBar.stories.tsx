import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ControlBar } from './ControlBar';

const meta: Meta<typeof ControlBar> = {
  title: 'Organisms/ControlBar',
  component: ControlBar,
  tags: ['autodocs'],
  args: {
    botCount: 2,
    onNewNormalOrder: fn(),
    onNewVipOrder: fn(),
    onAddBot: fn(),
    onRemoveBot: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ControlBar>;

export const Default: Story = {};
export const NoBots: Story = { args: { botCount: 0 } };
