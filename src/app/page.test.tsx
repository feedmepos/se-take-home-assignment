import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderController } from '@/application/modules';
import { renderWithTheme } from '@/test/render-with-theme';
import HomePage from './page';

const renderApp = () =>
  renderWithTheme(
    <OrderController.OrderControllerProvider>
      <HomePage />
    </OrderController.OrderControllerProvider>,
  );

const pendingRegion = () => screen.getByRole('region', { name: 'Pending' });
const completeRegion = () => screen.getByRole('region', { name: 'Complete' });
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

describe('HomePage (end-to-end wiring)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flows an order from PENDING through a bot to COMPLETE after 10s', () => {
    renderApp();

    click('New Normal Order');
    expect(within(pendingRegion()).getByText('Order #1')).toBeInTheDocument();

    click('+ Bot');
    // Picked up by the bot, so it leaves the pending column immediately.
    expect(
      within(pendingRegion()).queryByText('Order #1'),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(within(completeRegion()).getByText('Order #1')).toBeInTheDocument();
  });

  it('shows a VIP order ahead of an earlier Normal order in PENDING', () => {
    renderApp();

    click('New Normal Order'); // #1
    click('New VIP Order'); // #2

    const cards = within(pendingRegion()).getAllByText(/Order #/);
    expect(cards.map((c) => c.textContent)).toEqual(['Order #2', 'Order #1']);
  });

  it('returns an interrupted order to PENDING when its bot is removed', () => {
    renderApp();

    click('New VIP Order'); // #1
    click('+ Bot'); // bot picks up #1 -> leaves pending
    expect(
      within(pendingRegion()).queryByText('Order #1'),
    ).not.toBeInTheDocument();

    click('- Bot'); // destroy the bot mid-cook
    expect(within(pendingRegion()).getByText('Order #1')).toBeInTheDocument();
  });
});
