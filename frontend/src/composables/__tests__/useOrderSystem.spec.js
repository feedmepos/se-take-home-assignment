import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOrderSystem } from '../useOrderSystem'
import { mount, flushPromises } from '@vue/test-utils'

// Helper to run composables with lifecycle hooks
function withSetup(composable) {
  let result
  const app = mount({
    setup() {
      result = composable()
      return () => {}
    }
  })
  return [result, app]
}

// Mock fetch
global.fetch = vi.fn()

describe('useOrderSystem', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [], bots: [] })
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('initializes with empty state', () => {
    const [result, app] = withSetup(() => useOrderSystem())
    const { orders, bots, pendingOrders, completeOrders, error } = result
    
    expect(orders.value).toEqual([])
    expect(bots.value).toEqual([])
    expect(pendingOrders.value).toEqual([])
    expect(completeOrders.value).toEqual([])
    expect(error.value).toBeNull()
    
    app.unmount()
  })

  it('addOrder makes correct API call', async () => {
    const [result, app] = withSetup(() => useOrderSystem())
    const { addOrder } = result
    
    fetch.mockResolvedValueOnce({ ok: true }) // add call
         .mockResolvedValueOnce({ // state refresh
           ok: true, 
           json: async () => ({ 
             orders: [{ id: 1, type: 'NORMAL', status: 'PENDING' }], 
             bots: [] 
           }) 
         })

    await addOrder('NORMAL')
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'NORMAL' })
      })
    )
    
    app.unmount()
  })

  it('addBot makes correct API call', async () => {
    const [result, app] = withSetup(() => useOrderSystem())
    const { addBot } = result
    
    fetch.mockResolvedValueOnce({ ok: true })
         .mockResolvedValueOnce({ 
           ok: true, 
           json: async () => ({ orders: [], bots: [{ id: 1, status: 'IDLE' }] }) 
         })

    await addBot()
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bots'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'add' })
      })
    )
    
    app.unmount()
  })

  it('removeBot makes correct API call', async () => {
    const [result, app] = withSetup(() => useOrderSystem())
    const { removeBot } = result
    
    fetch.mockResolvedValueOnce({ ok: true })
         .mockResolvedValueOnce({ 
           ok: true, 
           json: async () => ({ orders: [], bots: [] }) 
         })

    await removeBot()
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bots'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'remove' })
      })
    )
    
    app.unmount()
  })
  
  it('handles fetch errors correctly', async () => {
    const [result, app] = withSetup(() => useOrderSystem())
    const { addOrder, error } = result
    
    // Test failures during operations
    fetch.mockResolvedValueOnce({ ok: true }) // add success
         .mockRejectedValueOnce(new Error('State fetch failed')) // state fetch fail
         
    await addOrder('VIP')
    await flushPromises()
    
    expect(error.value).toBe('State fetch failed')
    
    app.unmount()
  })
})
