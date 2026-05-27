import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompleteList } from './CompleteList';
import type { OrderDTO } from '@contracts';

const orders: OrderDTO[] = [
  {
    id: 1,
    type: 'NORMAL',
    status: 'COMPLETE',
    createdAt: '2026-05-28T00:00:00.000Z',
    completedAt: '2026-05-28T00:00:10.000Z',
  },
  {
    id: 2,
    type: 'VIP',
    status: 'COMPLETE',
    createdAt: '2026-05-28T00:00:01.000Z',
    completedAt: '2026-05-28T00:00:11.000Z',
  },
];

describe('CompleteList', () => {
  it('renders the section title "Complete"', () => {
    render(<CompleteList orders={orders} />);
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('renders 2 order cards for 2 completed orders', () => {
    render(<CompleteList orders={orders} />);
    expect(screen.getByText('Normal Order #1')).toBeDefined();
    expect(screen.getByText('VIP Order #2')).toBeDefined();
  });

  it('renders VIP order with "VIP" badge text', () => {
    render(<CompleteList orders={orders} />);
    const badge = screen.getByText('VIP', { selector: '[class*="badge"]' });
    expect(badge).toBeDefined();
  });

  it('has an aria-live="polite" region', () => {
    render(<CompleteList orders={orders} />);
    const politeEl = document.querySelector('[aria-live="polite"]');
    expect(politeEl).not.toBeNull();
  });

  it('shows empty message when orders is empty, no order cards', () => {
    render(<CompleteList orders={[]} />);
    expect(screen.getByText('No completed orders')).toBeDefined();
    const cards = screen.queryAllByText(/Order #/);
    expect(cards.length).toBe(0);
  });

  it('does NOT show empty message when there are orders', () => {
    render(<CompleteList orders={orders} />);
    expect(screen.queryByText('No completed orders')).toBeNull();
  });
});
