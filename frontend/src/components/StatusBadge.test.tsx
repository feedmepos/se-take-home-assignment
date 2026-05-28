import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { humanizeStatus } from './humanizeStatus';
import { StatusBadge } from './StatusBadge';

describe('humanizeStatus', () => {
  it('maps PENDING → "Pending"', () => {
    expect(humanizeStatus('PENDING')).toBe('Pending');
  });

  it('maps PROCESSING → "Processing"', () => {
    expect(humanizeStatus('PROCESSING')).toBe('Processing');
  });

  it('maps COMPLETE → "Complete"', () => {
    expect(humanizeStatus('COMPLETE')).toBe('Complete');
  });

  it('maps IDLE → "Idle"', () => {
    expect(humanizeStatus('IDLE')).toBe('Idle');
  });
});

describe('StatusBadge', () => {
  it('renders "Pending" for PENDING status', () => {
    render(<StatusBadge status="PENDING" />);
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('renders "Processing" for PROCESSING status', () => {
    render(<StatusBadge status="PROCESSING" />);
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('renders "Complete" for COMPLETE status', () => {
    render(<StatusBadge status="COMPLETE" />);
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('renders "Idle" for IDLE status', () => {
    render(<StatusBadge status="IDLE" />);
    expect(screen.getByText('Idle')).toBeDefined();
  });
});
