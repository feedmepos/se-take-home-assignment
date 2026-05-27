import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('keeps shared order state while switching roles', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /New Normal Order/i }))
    await user.click(screen.getByRole('tab', { name: /VIP Member/i }))
    await user.click(screen.getByRole('button', { name: /New VIP Order/i }))

    const pendingOrders = within(screen.getByTestId('pending-orders')).getAllByRole('article')

    expect(pendingOrders.map((orderCard) => orderCard.textContent)).toEqual([
      expect.stringContaining('Order #2'),
      expect.stringContaining('Order #1'),
    ])
  })

  it('shows manager-only bot controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('button', { name: '+ Bot' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Manager/i }))

    expect(screen.getByRole('button', { name: '+ Bot' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '- Bot' })).toBeInTheDocument()
    expect(screen.getByText(/Newest bot is removed first/i)).toBeInTheDocument()
  })
})
