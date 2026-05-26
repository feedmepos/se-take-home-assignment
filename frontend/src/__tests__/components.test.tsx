import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import PendingColumn from '../components/PendingColumn';
import CompleteColumn from '../components/CompleteColumn';
import OrderControls from '../components/OrderControls';
import BotCard from '../components/BotCard';
import BotControls from '../components/BotControls';
import NavBar from '../components/NavBar';

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('OrderCard', () => {
  it('should render order id and type', () => {
    const order = { id: 1, type: 'NORMAL' as const, status: 'PENDING' as const, createdAt: Date.now() };
    render(<OrderCard order={order} />);
    expect(screen.getByText('Order-1')).toBeDefined();
    expect(screen.getByText('NORMAL')).toBeDefined();
  });

  it('should render VIP label', () => {
    const order = { id: 2, type: 'VIP' as const, status: 'PENDING' as const, createdAt: Date.now() };
    render(<OrderCard order={order} />);
    expect(screen.getByText('Order-2')).toBeDefined();
    expect(screen.getByText('VIP')).toBeDefined();
  });

  it('should show completed timestamp when completed', () => {
    const now = Date.now();
    const order = { id: 3, type: 'NORMAL' as const, status: 'COMPLETE' as const, createdAt: now, completedAt: now };
    render(<OrderCard order={order} />);
    expect(screen.getByText(/完成于/)).toBeDefined();
  });
});

describe('PendingColumn', () => {
  it('should render pending orders', () => {
    const orders = [
      { id: 1, type: 'NORMAL' as const, status: 'PENDING' as const, createdAt: Date.now() },
    ];
    render(<PendingColumn orders={orders} />);
    expect(screen.getByText('Order-1')).toBeDefined();
    expect(screen.getByText(/PENDING/)).toBeDefined();
  });

  it('should show empty state', () => {
    render(<PendingColumn orders={[]} />);
    expect(screen.getByText(/暂无待处理订单/)).toBeDefined();
  });
});

describe('CompleteColumn', () => {
  it('should render completed orders', () => {
    const orders = [
      { id: 1, type: 'VIP' as const, status: 'COMPLETE' as const, createdAt: Date.now(), completedAt: Date.now() },
    ];
    render(<CompleteColumn orders={orders} />);
    expect(screen.getByText('Order-1')).toBeDefined();
    expect(screen.getByText(/COMPLETE/)).toBeDefined();
  });

  it('should show empty state', () => {
    render(<CompleteColumn orders={[]} />);
    expect(screen.getByText(/暂无已完成订单/)).toBeDefined();
  });
});

describe('OrderControls', () => {
  it('should call onNewNormal when button clicked', async () => {
    const onNormal = vi.fn();
    const onVip = vi.fn();
    render(<OrderControls onNewNormal={onNormal} onNewVip={onVip} />);

    await userEvent.click(screen.getByText('New Normal Order'));
    expect(onNormal).toHaveBeenCalled();
  });

  it('should call onNewVip when button clicked', async () => {
    const onNormal = vi.fn();
    const onVip = vi.fn();
    render(<OrderControls onNewNormal={onNormal} onNewVip={onVip} />);

    await userEvent.click(screen.getByText('New VIP Order'));
    expect(onVip).toHaveBeenCalled();
  });
});

describe('BotCard', () => {
  it('should render bot name and IDLE status', () => {
    const bot = { id: 1, name: 'Bot-1', status: 'IDLE' as const };
    render(<BotCard bot={bot} />);
    expect(screen.getByText('Bot-1')).toBeDefined();
    expect(screen.getByText('IDLE')).toBeDefined();
  });

  it('should render processing status with current order', () => {
    const bot = { id: 2, name: 'Bot-2', status: 'PROCESSING' as const, currentOrderId: 5 };
    render(<BotCard bot={bot} />);
    expect(screen.getByText('PROCESSING')).toBeDefined();
    expect(screen.getByText(/Order-5/)).toBeDefined();
  });
});

describe('BotControls', () => {
  it('should call onAdd when + Bot clicked', async () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(<BotControls onAdd={onAdd} onRemove={onRemove} />);

    await userEvent.click(screen.getByText('+ Bot'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('should call onRemove when - Bot clicked', async () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(<BotControls onAdd={onAdd} onRemove={onRemove} />);

    await userEvent.click(screen.getByText('- Bot'));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('NavBar', () => {
  it('should render both nav links', () => {
    renderWithRouter(<NavBar />);
    expect(screen.getByText('我的订单')).toBeDefined();
    expect(screen.getByText('Bot 管理')).toBeDefined();
  });

  it('should have links pointing to correct routes', () => {
    renderWithRouter(<NavBar />);
    const orderLink = screen.getByText('我的订单');
    const botLink = screen.getByText('Bot 管理');
    expect(orderLink.getAttribute('href')).toBe('/orders');
    expect(botLink.getAttribute('href')).toBe('/bots');
  });
});
