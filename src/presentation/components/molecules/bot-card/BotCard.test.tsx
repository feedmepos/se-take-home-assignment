import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BotStatus, OrderStatus, OrderType } from '@/domain';
import { renderWithTheme } from '@/test/render-with-theme';
import { BotCard } from './BotCard';

describe('BotCard', () => {
  it('shows a VIP badge when cooking a VIP order', () => {
    renderWithTheme(
      <BotCard
        bot={{ id: 1, status: BotStatus.PROCESSING, currentOrderId: 8 }}
        order={{ id: 8, type: OrderType.VIP, status: OrderStatus.PROCESSING }}
      />,
    );

    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Order #8')).toBeInTheDocument();
  });

  it('shows no VIP badge for a normal order', () => {
    renderWithTheme(
      <BotCard
        bot={{ id: 1, status: BotStatus.PROCESSING, currentOrderId: 7 }}
        order={{ id: 7, type: OrderType.NORMAL, status: OrderStatus.PROCESSING }}
      />,
    );

    expect(screen.queryByText('VIP')).not.toBeInTheDocument();
  });

  it('shows no VIP badge when idle', () => {
    renderWithTheme(
      <BotCard bot={{ id: 1, status: BotStatus.IDLE, currentOrderId: null }} />,
    );

    expect(screen.queryByText('VIP')).not.toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});
