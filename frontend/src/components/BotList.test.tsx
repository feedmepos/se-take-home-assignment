import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BotList } from './BotList';
import type { BotDTO, OrderDTO } from '@contracts';

describe('BotList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the section title "Bots"', () => {
    render(<BotList bots={[]} processing={[]} cookDurationMs={10000} />);
    expect(screen.getByText('Bots')).toBeDefined();
  });

  it('shows empty message when there are no bots', () => {
    render(<BotList bots={[]} processing={[]} cookDurationMs={10000} />);
    expect(screen.getByText('No bots')).toBeDefined();
  });

  it('shows "Bot #<id>" for each bot', () => {
    const bots: BotDTO[] = [
      { id: 1, status: 'IDLE', currentOrderId: null },
      { id: 2, status: 'IDLE', currentOrderId: null },
    ];
    render(<BotList bots={bots} processing={[]} cookDurationMs={10000} />);
    expect(screen.getByText('Bot #1')).toBeDefined();
    expect(screen.getByText('Bot #2')).toBeDefined();
  });

  it('shows "Idle" status badge in the bot header for an IDLE bot', () => {
    const bots: BotDTO[] = [
      { id: 1, status: 'IDLE', currentOrderId: null },
    ];
    render(<BotList bots={bots} processing={[]} cookDurationMs={10000} />);
    expect(screen.getByText('Idle')).toBeDefined();
  });

  it('shows "Processing" status badge in the bot header for a PROCESSING bot', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();
    const order: OrderDTO = {
      id: 5,
      type: 'NORMAL',
      status: 'PROCESSING',
      createdAt: new Date(now - 4000).toISOString(),
      startedAt,
    };
    const bots: BotDTO[] = [
      { id: 1, status: 'PROCESSING', currentOrderId: 5 },
    ];
    const processing = [{ order, botId: 1 }];
    render(<BotList bots={bots} processing={processing} cookDurationMs={10000} />);
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('renders the order for a PROCESSING bot', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    const order: OrderDTO = {
      id: 5,
      type: 'NORMAL',
      status: 'PROCESSING',
      createdAt: new Date(now - 4000).toISOString(),
      startedAt,
    };
    const bots: BotDTO[] = [
      { id: 1, status: 'PROCESSING', currentOrderId: 5 },
    ];
    const processing = [{ order, botId: 1 }];

    render(<BotList bots={bots} processing={processing} cookDurationMs={10000} />);

    // Should show bot label
    expect(screen.getByText('Bot #1')).toBeDefined();
    // Should render the order
    expect(screen.getByText('Normal Order #5')).toBeDefined();
  });

  it('renders a countdown (Ns) on the order row for a PROCESSING bot', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    const order: OrderDTO = {
      id: 5,
      type: 'NORMAL',
      status: 'PROCESSING',
      createdAt: new Date(now - 4000).toISOString(),
      startedAt,
    };
    const bots: BotDTO[] = [
      { id: 1, status: 'PROCESSING', currentOrderId: 5 },
    ];
    const processing = [{ order, botId: 1 }];

    render(<BotList bots={bots} processing={processing} cookDurationMs={10000} />);

    // Should show a countdown like "7s" on the order row
    expect(screen.getByText('7s')).toBeDefined();
  });

  it('does NOT show "Idle" status for a PROCESSING bot', () => {
    const now = Date.now();
    const startedAt = new Date(now - 3000).toISOString();

    const order: OrderDTO = {
      id: 5,
      type: 'NORMAL',
      status: 'PROCESSING',
      createdAt: new Date(now - 4000).toISOString(),
      startedAt,
    };
    const bots: BotDTO[] = [
      { id: 1, status: 'PROCESSING', currentOrderId: 5 },
    ];
    const processing = [{ order, botId: 1 }];

    render(<BotList bots={bots} processing={processing} cookDurationMs={10000} />);

    expect(screen.queryByText('Idle')).toBeNull();
  });

  it('shows empty message only, no bot cards when bots is empty', () => {
    render(<BotList bots={[]} processing={[]} cookDurationMs={10000} />);
    expect(screen.queryByText(/Bot #/)).toBeNull();
  });

  it('does not render an order row for an IDLE bot', () => {
    const bots: BotDTO[] = [
      { id: 1, status: 'IDLE', currentOrderId: null },
    ];
    render(<BotList bots={bots} processing={[]} cookDurationMs={10000} />);
    expect(screen.queryByText(/Order #/)).toBeNull();
  });

  it('shows "No order queued" placeholder for an IDLE bot', () => {
    const bots: BotDTO[] = [
      { id: 1, status: 'IDLE', currentOrderId: null },
    ];
    render(<BotList bots={bots} processing={[]} cookDurationMs={10000} />);
    expect(screen.getByText('No order queued')).toBeDefined();
  });
});
