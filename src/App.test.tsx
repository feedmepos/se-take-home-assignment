import { act, fireEvent, render, screen, within } from '@testing-library/react'

import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a bot process VIP orders before normal orders', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /new normal order/i }))
    fireEvent.click(screen.getByRole('button', { name: /new vip order/i }))
    fireEvent.click(screen.getByRole('button', { name: /add bot/i }))

    const processingCard = screen.getByRole('region', {
      name: /cooking bots/i,
    })

    expect(within(processingCard).getByText(/processing order #2/i)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })

    const completeCard = screen.getByRole('region', {
      name: /complete orders/i,
    })

    expect(within(completeCard).getByText('Order #2')).toBeInTheDocument()
    expect(screen.getByText(/processing order #1/i)).toBeInTheDocument()
  })

  it('returns a canceled order to pending when the newest bot is removed', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /new normal order/i }))
    fireEvent.click(screen.getByRole('button', { name: /add bot/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove newest bot/i }))

    const pendingCard = screen.getByRole('region', {
      name: /pending orders/i,
    })

    expect(within(pendingCard).getByText('Order #1')).toBeInTheDocument()
    expect(screen.getByText('No bots available')).toBeInTheDocument()
  })
})
