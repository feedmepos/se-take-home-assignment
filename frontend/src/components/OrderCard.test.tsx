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

  it('renders a VIP badge containing "VIP" for VIP orders', () => {
    render(<OrderCard order={vipOrder} />);
    // There should be a badge element with text "VIP"
    const badge = screen.getByText('VIP', { selector: '[class*="badge"]' });
    expect(badge).toBeDefined();
  });

  it('does NOT render a VIP badge for NORMAL orders', () => {
    render(<OrderCard order={normalOrder} />);
    // The "VIP" text from badge should not appear for normal orders
    const badges = screen.queryAllByText('VIP', { selector: '[class*="badge"]' });
    expect(badges.length).toBe(0);
  });

  it('shows the order status text', () => {
    render(<OrderCard order={normalOrder} />);
    expect(screen.getByText('PENDING')).toBeDefined();
  });

  it('shows PROCESSING status for a processing order', () => {
    render(<OrderCard order={vipOrder} />);
    expect(screen.getByText('PROCESSING')).toBeDefined();
  });
});
