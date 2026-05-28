import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderCard } from './OrderCard';
import type { OrderDTO } from '@contracts';

const normalOrder: OrderDTO = {
  id: 1,
  type: 'NORMAL',
  status: 'PENDING',
  createdAt: '2026-05-28T00:00:00.000Z',
};

const vipOrder: OrderDTO = {
  id: 2,
  type: 'VIP',
  status: 'PROCESSING',
  createdAt: '2026-05-28T00:00:00.000Z',
  startedAt: '2026-05-28T00:00:01.000Z',
};

describe('OrderCard', () => {
  it('renders "Normal Order #1" for a NORMAL order with id 1', () => {
    render(<OrderCard order={normalOrder} />);
    expect(screen.getByText('Normal Order #1')).toBeDefined();
  });

  it('renders "VIP Order #2" for a VIP order with id 2', () => {
    render(<OrderCard order={vipOrder} />);
    expect(screen.getByText('VIP Order #2')).toBeDefined();
  });

  it('does NOT render a separate "VIP" badge for VIP orders (title carries the label)', () => {
    render(<OrderCard order={vipOrder} />);
    // The standalone "VIP" badge is gone — only the full title text "VIP Order #2" appears
    expect(screen.queryByText('VIP', { selector: '[class*="badge"]' })).toBeNull();
  });

  it('renders the trailing node when provided (e.g. a countdown)', () => {
    render(<OrderCard order={normalOrder} trailing={<span>7s</span>} />);
    expect(screen.getByText('7s')).toBeDefined();
  });

  it('renders only the title, no status badge, when trailing is omitted (the Kanban column encodes status)', () => {
    render(<OrderCard order={normalOrder} />);
    expect(screen.getByText('Normal Order #1')).toBeDefined();
    expect(screen.queryByText('Pending')).toBeNull();
  });
});
