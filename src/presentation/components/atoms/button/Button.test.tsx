import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '@/test/render-with-theme';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and fires onClick', () => {
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>+ Bot</Button>);

    fireEvent.click(screen.getByRole('button', { name: '+ Bot' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    renderWithTheme(
      <Button onClick={onClick} disabled>
        - Bot
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: '- Bot' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
