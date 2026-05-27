import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Controls } from './Controls';

describe('Controls', () => {
  it('renders all 4 buttons by accessible name', () => {
    render(
      <Controls
        onNewNormal={vi.fn()}
        onNewVip={vi.fn()}
        onAddBot={vi.fn()}
        onDelBot={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'New Normal Order' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'New VIP Order' })).toBeDefined();
    expect(screen.getByRole('button', { name: '+ Bot' })).toBeDefined();
    expect(screen.getByRole('button', { name: '- Bot' })).toBeDefined();
  });

  it('calls onNewNormal exactly once when "New Normal Order" is clicked', async () => {
    const user = userEvent.setup();
    const onNewNormal = vi.fn();

    render(
      <Controls
        onNewNormal={onNewNormal}
        onNewVip={vi.fn()}
        onAddBot={vi.fn()}
        onDelBot={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New Normal Order' }));
    expect(onNewNormal).toHaveBeenCalledOnce();
  });

  it('calls onNewVip exactly once when "New VIP Order" is clicked', async () => {
    const user = userEvent.setup();
    const onNewVip = vi.fn();

    render(
      <Controls
        onNewNormal={vi.fn()}
        onNewVip={onNewVip}
        onAddBot={vi.fn()}
        onDelBot={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New VIP Order' }));
    expect(onNewVip).toHaveBeenCalledOnce();
  });

  it('calls onAddBot exactly once when "+ Bot" is clicked', async () => {
    const user = userEvent.setup();
    const onAddBot = vi.fn();

    render(
      <Controls
        onNewNormal={vi.fn()}
        onNewVip={vi.fn()}
        onAddBot={onAddBot}
        onDelBot={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '+ Bot' }));
    expect(onAddBot).toHaveBeenCalledOnce();
  });

  it('calls onDelBot exactly once when "- Bot" is clicked', async () => {
    const user = userEvent.setup();
    const onDelBot = vi.fn();

    render(
      <Controls
        onNewNormal={vi.fn()}
        onNewVip={vi.fn()}
        onAddBot={vi.fn()}
        onDelBot={onDelBot}
      />,
    );

    await user.click(screen.getByRole('button', { name: '- Bot' }));
    expect(onDelBot).toHaveBeenCalledOnce();
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <Controls
        onNewNormal={vi.fn()}
        onNewVip={vi.fn()}
        onAddBot={vi.fn()}
        onDelBot={vi.fn()}
        disabled={true}
      />,
    );

    expect((screen.getByRole('button', { name: 'New Normal Order' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'New VIP Order' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '+ Bot' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '- Bot' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('does NOT disable buttons when disabled prop is false', () => {
    render(
      <Controls
        onNewNormal={vi.fn()}
        onNewVip={vi.fn()}
        onAddBot={vi.fn()}
        onDelBot={vi.fn()}
        disabled={false}
      />,
    );

    expect((screen.getByRole('button', { name: 'New Normal Order' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('does NOT call handler when button is disabled and clicked', async () => {
    const user = userEvent.setup();
    const onNewNormal = vi.fn();

    render(
      <Controls
        onNewNormal={onNewNormal}
        onNewVip={vi.fn()}
        onAddBot={vi.fn()}
        onDelBot={vi.fn()}
        disabled={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New Normal Order' }));
    expect(onNewNormal).not.toHaveBeenCalled();
  });
});
