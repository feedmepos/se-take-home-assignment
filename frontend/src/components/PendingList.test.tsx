import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PendingList } from './PendingList';
import type { OrderDTO } from '@contracts';

const orders: OrderDTO[] = [
  { id: 1, type: 'NORMAL', status: 'PENDING', createdAt: '2026-05-28T00:00:00.000Z' },
  { id: 2, type: 'VIP', status: 'PENDING', createdAt: '2026-05-28T00:00:01.000Z' },
];

describe('PendingList', () => {
  it('renders the section title "Pending"', () => {
    render(<PendingList orders={orders} />);
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('renders 2 order cards for 2 orders', () => {
    render(<PendingList orders={orders} />);
    expect(screen.getByText('Normal Order #1')).toBeDefined();
    expect(screen.getByText('VIP Order #2')).toBeDefined();
  });

  it('renders VIP order with "VIP" badge text', () => {
    render(<PendingList orders={orders} />);
    // VIP badge should appear
    const badge = screen.getByText('VIP', { selector: '[class*="badge"]' });
    expect(badge).toBeDefined();
  });

  it('renders orders in the given array order (no re-sorting)', () => {
    const orderedOrders: OrderDTO[] = [
      { id: 10, type: 'VIP', status: 'PENDING', createdAt: '2026-05-28T00:00:00.000Z' },
      { id: 3, type: 'NORMAL', status: 'PENDING', createdAt: '2026-05-28T00:00:01.000Z' },
    ];
    render(<PendingList orders={orderedOrders} />);
    const allCards = screen.getAllByText(/Order #/);
    // First rendered card should be id 10 (VIP), second should be id 3 (NORMAL)
    expect(allCards[0].textContent).toContain('10');
    expect(allCards[1].textContent).toContain('3');
  });

  it('has an aria-live="polite" region', () => {
    render(<PendingList orders={orders} />);
    const politeEl = document.querySelector('[aria-live="polite"]');
    expect(politeEl).not.toBeNull();
  });

  it('shows empty message when orders is empty, no order cards', () => {
    render(<PendingList orders={[]} />);
    expect(screen.getByText('No pending orders')).toBeDefined();
    const cards = screen.queryAllByText(/Order #/);
    expect(cards.length).toBe(0);
  });

  it('does NOT show empty message when there are orders', () => {
    render(<PendingList orders={orders} />);
    expect(screen.queryByText('No pending orders')).toBeNull();
  });
});
