import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../src/services/api', () => ({
  api: {
    createOrder: vi.fn().mockResolvedValue(undefined),
    addBot: vi.fn().mockResolvedValue(undefined),
    removeBot: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ControlBar } from '../src/features/ControlBar';
import { api } from '../src/services/api';

describe('ControlBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a normal order when clicking New Normal', async () => {
    render(<ControlBar />);
    fireEvent.click(screen.getByText('New Normal'));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledWith('NORMAL'));
  });

  it('creates a VIP order when clicking New VIP', async () => {
    render(<ControlBar />);
    fireEvent.click(screen.getByText('✦ New VIP'));
    await waitFor(() => expect(api.createOrder).toHaveBeenCalledWith('VIP'));
  });

  it('adds and removes bots', async () => {
    render(<ControlBar />);
    fireEvent.click(screen.getByText('+ Add Bot'));
    fireEvent.click(screen.getByText('− Remove Bot'));
    await waitFor(() => expect(api.addBot).toHaveBeenCalledOnce());
    await waitFor(() => expect(api.removeBot).toHaveBeenCalledOnce());
  });
});
