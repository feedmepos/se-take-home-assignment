import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderCard } from '../src/components/OrderCard';
import { OrderType, OrderStatus, type OrderSnapshot } from '@feedme/core';

const make = (over: Partial<OrderSnapshot>): OrderSnapshot => ({
  id: 1001,
  type: OrderType.NORMAL,
  status: OrderStatus.PENDING,
  createdAt: 0,
  completedAt: null,
  ...over,
});

describe('OrderCard', () => {
  it('shows the order number and a VIP badge for VIP orders', () => {
    render(<OrderCard order={make({ id: 1002, type: OrderType.VIP })} now={0} />);
    expect(screen.getByText('#1002')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('shows a Normal badge for normal orders', () => {
    render(<OrderCard order={make({ type: OrderType.NORMAL })} now={0} />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('shows remaining seconds and bot for a processing order', () => {
    render(
      <OrderCard
        order={make({ status: OrderStatus.PROCESSING })}
        startedAt={1000}
        now={4000}
        botId={3}
      />,
    );
    expect(screen.getByText('Bot #3')).toBeInTheDocument();
    expect(screen.getByText('7s left')).toBeInTheDocument();
  });

  it('shows a completion marker for a complete order', () => {
    render(<OrderCard order={make({ status: OrderStatus.COMPLETE, completedAt: 0 })} now={0} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});
