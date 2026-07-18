import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderStatus, OrderType } from '@/domain';
import { renderWithTheme } from '@/test/render-with-theme';
import { OrderCard } from './OrderCard';

describe('OrderCard', () => {
  it('shows the order number, tier and status', () => {
    renderWithTheme(
      <OrderCard
        order={{ id: 7, type: OrderType.VIP, status: OrderStatus.PROCESSING }}
      />,
    );

    expect(screen.getByText('Order #7')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Cooking')).toBeInTheDocument();
  });

  it('labels a normal pending order', () => {
    renderWithTheme(
      <OrderCard
        order={{ id: 1, type: OrderType.NORMAL, status: OrderStatus.PENDING }}
      />,
    );

    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
