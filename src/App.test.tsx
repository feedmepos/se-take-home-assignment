import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'

function clickButton(name: string) {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('shows VIP orders ahead of normal orders in the pending area', () => {
    render(<App />)

    clickButton('New Normal Order')
    clickButton('New Normal Order')
    clickButton('New VIP Order')

    const pendingOrders = within(screen.getByTestId('pending-orders')).getAllByRole('listitem')

    expect(pendingOrders.map((item) => item.textContent)).toEqual([
      expect.stringContaining('VIPOrder #3'),
      expect.stringContaining('NORMALOrder #1'),
      expect.stringContaining('NORMALOrder #2'),
    ])
  })

  it('starts processing immediately when a bot is added and completes after 10 seconds', () => {
    render(<App />)

    clickButton('New VIP Order')
    clickButton('+ Bot')

    expect(screen.getByText('PROCESSING Order #1')).toBeInTheDocument()
    expect(within(screen.getByTestId('pending-orders')).getByText('No pending orders')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByText('IDLE')).toBeInTheDocument()
    expect(within(screen.getByTestId('completed-orders')).getByText(/Order #1/)).toBeInTheDocument()
  })

  it('returns a processing order to pending when the newest bot is removed', () => {
    render(<App />)

    clickButton('New Normal Order')
    clickButton('+ Bot')

    expect(screen.getByText('PROCESSING Order #1')).toBeInTheDocument()

    clickButton('- Bot')

    expect(within(screen.getByTestId('bot-list')).getByText('No bots available')).toBeInTheDocument()
    expect(within(screen.getByTestId('pending-orders')).getByText(/Order #1/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(within(screen.getByTestId('completed-orders')).getByText('No completed orders')).toBeInTheDocument()
  })

  it('lets an idle bot pick up a newly created order automatically', () => {
    act(() => {
      render(<App />)
    })

    clickButton('+ Bot')
    expect(screen.getByText('IDLE')).toBeInTheDocument()

    clickButton('New VIP Order')

    expect(screen.getByText('PROCESSING Order #1')).toBeInTheDocument()
    expect(within(screen.getByTestId('pending-orders')).getByText('No pending orders')).toBeInTheDocument()
  })
})
