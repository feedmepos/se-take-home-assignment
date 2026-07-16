import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BotStatus, OrderStatus, OrderType } from '@/domain';
import { renderWithTheme } from '@/test/render-with-theme';
import { DashboardTemplate, type DashboardTemplateProps } from './DashboardTemplate';

const baseProps = (): DashboardTemplateProps => ({
  pending: [],
  processing: [],
  complete: [],
  bots: [],
  onNewNormalOrder: vi.fn(),
  onNewVipOrder: vi.fn(),
  onAddBot: vi.fn(),
  onRemoveBot: vi.fn(),
});

const pendingRegion = () => screen.getByRole('region', { name: 'Pending' });
const completeRegion = () => screen.getByRole('region', { name: 'Complete' });

describe('DashboardTemplate (presentational)', () => {
  it('renders orders into the correct columns', () => {
    renderWithTheme(
      <DashboardTemplate
        {...baseProps()}
        pending={[{ id: 2, type: OrderType.VIP, status: OrderStatus.PENDING }]}
        complete={[
          { id: 1, type: OrderType.NORMAL, status: OrderStatus.COMPLETE },
        ]}
        bots={[{ id: 1, status: BotStatus.PROCESSING, currentOrderId: 2 }]}
      />,
    );

    expect(within(pendingRegion()).getByText('Order #2')).toBeInTheDocument();
    expect(within(completeRegion()).getByText('Order #1')).toBeInTheDocument();
    expect(screen.getByText('Bot #1')).toBeInTheDocument();
  });

  it('forwards control actions to its handlers', () => {
    const props = baseProps();
    renderWithTheme(<DashboardTemplate {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'New Normal Order' }));
    fireEvent.click(screen.getByRole('button', { name: 'New VIP Order' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Bot' }));

    expect(props.onNewNormalOrder).toHaveBeenCalledOnce();
    expect(props.onNewVipOrder).toHaveBeenCalledOnce();
    expect(props.onAddBot).toHaveBeenCalledOnce();
  });

  it('disables "- Bot" when there are no bots', () => {
    renderWithTheme(<DashboardTemplate {...baseProps()} />);
    expect(screen.getByRole('button', { name: '- Bot' })).toBeDisabled();
  });
});
