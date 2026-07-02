import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('App', () => {
  it('creates normal and VIP orders in the pending area', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));
    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));
    fireEvent.click(screen.getByRole('button', { name: 'New VIP Order' }));

    const pendingList = screen.getByRole('list', { name: 'PENDING orders' });
    const items = within(pendingList).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('VIP Order #3')).toBeInTheDocument();
    expect(within(items[1]).getByText('Normal Order #1')).toBeInTheDocument();
    expect(within(items[2]).getByText('Normal Order #2')).toBeInTheDocument();
  });

  it('keeps an order pending after 10 seconds when no bot is available', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Pending orders wait here until a cooking bot is available',
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    const pendingList = screen.getByRole('list', { name: 'PENDING orders' });
    expect(within(pendingList).getByText('Normal Order #1')).toBeInTheDocument();
    expect(screen.getByText('No completed orders yet.')).toBeInTheDocument();
  });

  it('moves an order from pending to processing and then complete after 10 seconds', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Bot' }));

    expect(screen.getByText('Bot #1')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    expect(screen.getByText('Normal Order #1')).toBeInTheDocument();
    expect(screen.getByText('No pending orders.')).toBeInTheDocument();
    expect(screen.getByLabelText('Bot #1 countdown')).toHaveTextContent('10s remaining');

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByLabelText('Bot #1 countdown')).toHaveTextContent('9s remaining');

    act(() => {
      vi.advanceTimersByTime(9_000);
    });

    const completeList = screen.getByRole('list', { name: 'COMPLETE orders' });
    expect(within(completeList).getByText('Normal Order #1')).toBeInTheDocument();
    expect(screen.getByText('IDLE')).toBeInTheDocument();
  });

  it('automatically starts the next pending order after completion', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));
    fireEvent.click(screen.getByRole('button', { name: 'New VIP Order' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Bot' }));

    expect(screen.getByText('VIP Order #2')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText('Normal Order #1')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
  });

  it('removes the newest processing bot and prevents stale completion', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Bot' }));
    fireEvent.click(screen.getByRole('button', { name: '- Bot' }));

    expect(screen.queryByText('Bot #1')).not.toBeInTheDocument();
    const pendingList = screen.getByRole('list', { name: 'PENDING orders' });
    expect(within(pendingList).getByText('Normal Order #1')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText('No completed orders yet.')).toBeInTheDocument();
  });
});
