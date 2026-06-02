import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the heading', () => {
    render(<App />)
    expect(screen.getByText("McDonald's Order Controller")).toBeInTheDocument()
  })

  it('shows empty state messages when no orders or bots', () => {
    render(<App />)
    expect(screen.getByText('No pending orders')).toBeInTheDocument()
    expect(screen.getByText('No bots')).toBeInTheDocument()
    expect(screen.getByText('No completed orders')).toBeInTheDocument()
  })

  it('adds a normal order and shows it in PENDING', () => {
    render(<App />)
    fireEvent.click(screen.getByText('New Normal Order'))
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('NORMAL')).toBeInTheDocument()
  })

  it('adds a VIP order and shows it in PENDING', () => {
    render(<App />)
    fireEvent.click(screen.getByText('New VIP Order'))
    expect(screen.getByText('#1')).toBeInTheDocument()
    // "VIP" appears twice: badge and type label
    const vipElements = screen.getAllByText('VIP')
    expect(vipElements.length).toBeGreaterThanOrEqual(2)
  })

  it('adds a bot and shows it as IDLE', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Bot'))
    expect(screen.getByText('Bot #1')).toBeInTheDocument()
    expect(screen.getByText('IDLE')).toBeInTheDocument()
  })

  it('removes the last bot when - Bot is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('+ Bot'))
    expect(screen.getByText('Bot #1')).toBeInTheDocument()
    expect(screen.getByText('Bot #2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('- Bot'))
    expect(screen.queryByText('Bot #2')).not.toBeInTheDocument()
    expect(screen.getByText('Bot #1')).toBeInTheDocument()
  })

  it('disables - Bot button when no bots', () => {
    render(<App />)
    expect(screen.getByText('- Bot')).toBeDisabled()
  })

  it('bot picks up pending order and processes it', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('New Normal Order'))

    // Order should now be PROCESSING (not in PENDING)
    expect(screen.getByText('No pending orders')).toBeInTheDocument()
    expect(screen.getByText('PROCESSING')).toBeInTheDocument()

    // Advance 10s
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Bot back to IDLE
    expect(screen.getByText('IDLE')).toBeInTheDocument()
    // Order complete — #1 appears in COMPLETE section
    const completeSection = screen.getByText('COMPLETE').closest('div')
    expect(completeSection.textContent).toContain('#1')
  })

  it('sorts VIP orders before NORMAL in PENDING', () => {
    render(<App />)
    // Add NORMAL first, then VIP — no bots so both stay PENDING
    fireEvent.click(screen.getByText('New Normal Order'))
    fireEvent.click(screen.getByText('New VIP Order'))

    const pendingSection = screen.getByText('PENDING').closest('div')
    const orderTexts = pendingSection.textContent
    const vipIndex = orderTexts.indexOf('VIP')
    const normalIndex = orderTexts.indexOf('NORMAL')
    // VIP should come before NORMAL in text order
    expect(vipIndex).toBeLessThan(normalIndex)
  })

  it('removes a processing bot and returns order to PENDING', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('New Normal Order'))

    // Order is processing
    expect(screen.getByText('PROCESSING')).toBeInTheDocument()

    // Advance 3s (not enough for completion)
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // Remove the bot
    fireEvent.click(screen.getByText('- Bot'))

    // Order should be back in PENDING
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.queryByText('PROCESSING')).not.toBeInTheDocument()
  })

  it('processes multiple orders with multiple bots simultaneously', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('New Normal Order'))
    fireEvent.click(screen.getByText('New Normal Order'))
    fireEvent.click(screen.getByText('New Normal Order'))

    // All 3 bots should be PROCESSING
    const processingBadges = screen.getAllByText('PROCESSING')
    expect(processingBadges).toHaveLength(3)

    // Advance 10s
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // All bots back to IDLE
    const idleBadges = screen.getAllByText('IDLE')
    expect(idleBadges).toHaveLength(3)
  })

  it('accumulates orders in PENDING when no bots exist', () => {
    render(<App />)
    fireEvent.click(screen.getByText('New Normal Order'))
    fireEvent.click(screen.getByText('New Normal Order'))
    fireEvent.click(screen.getByText('New Normal Order'))

    const pendingSection = screen.getByText('PENDING').closest('div')
    expect(pendingSection.textContent).toContain('#1')
    expect(pendingSection.textContent).toContain('#2')
    expect(pendingSection.textContent).toContain('#3')
  })

  it('idle bots stay idle when no orders', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ Bot'))
    fireEvent.click(screen.getByText('+ Bot'))

    const idleBadges = screen.getAllByText('IDLE')
    expect(idleBadges).toHaveLength(2)
  })
})
