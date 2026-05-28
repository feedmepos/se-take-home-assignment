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
    expect(screen.getByRole('heading', { name: /complete/i })).toBeDefined();
  });

  it('renders 2 order cards for 2 completed orders', () => {
    render(<CompleteList orders={orders} />);
    expect(screen.getByText('Normal Order #1')).toBeDefined();
    expect(screen.getByText('VIP Order #2')).toBeDefined();
  });

  it('renders VIP order title as full text "VIP Order #N" (no separate VIP badge)', () => {
    render(<CompleteList orders={orders} />);
    // The VIP label is carried by the full order title, not a separate badge element
    expect(screen.getByText('VIP Order #2')).toBeDefined();
    expect(screen.queryByText('VIP', { selector: '[class*="badge"]' })).toBeNull();
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

  it('renders newer completed order before older one (newest-first sort)', () => {
    const olderFirst: OrderDTO[] = [
      {
        id: 10,
        type: 'NORMAL',
        status: 'COMPLETE',
        createdAt: '2026-05-28T00:00:00.000Z',
        completedAt: '2026-05-28T00:01:00.000Z', // older
      },
      {
        id: 20,
        type: 'VIP',
        status: 'COMPLETE',
        createdAt: '2026-05-28T00:00:05.000Z',
        completedAt: '2026-05-28T00:02:00.000Z', // newer
      },
    ];
    render(<CompleteList orders={olderFirst} />);
    const cards = screen.getAllByText(/Order #/);
    // Newer (id 20, completedAt 00:02) must appear first in the DOM
    expect(cards[0].textContent).toContain('20');
    expect(cards[1].textContent).toContain('10');
  });

  it('does not mutate the prop array when sorting', () => {
    const input: OrderDTO[] = [
      {
        id: 1,
        type: 'NORMAL',
        status: 'COMPLETE',
        createdAt: '2026-05-28T00:00:00.000Z',
        completedAt: '2026-05-28T00:01:00.000Z',
      },
      {
        id: 2,
        type: 'VIP',
        status: 'COMPLETE',
        createdAt: '2026-05-28T00:00:05.000Z',
        completedAt: '2026-05-28T00:02:00.000Z',
      },
    ];
    const originalFirstId = input[0].id;
    render(<CompleteList orders={input} />);
    // The original array must remain in its original order
    expect(input[0].id).toBe(originalFirstId);
  });
});
