import { describe, expect, it } from 'vitest'
import type { Order } from '../types'
import {
  insertNormalOrder,
  insertVipOrder,
  restoreOrder,
} from './orderQueue'

describe('insertVipOrder', () => {
  it('places VIP before all Normal orders', () => {
    const pending: Order[] = [
      { id: 1, type: 'normal' },
      { id: 2, type: 'normal' },
    ]
    const result = insertVipOrder(pending, { id: 3, type: 'vip' })
    expect(result.map((o) => o.id)).toEqual([3, 1, 2])
  })

  it('places VIP after existing VIP orders', () => {
    const pending: Order[] = [
      { id: 1, type: 'vip' },
      { id: 2, type: 'normal' },
    ]
    const result = insertVipOrder(pending, { id: 3, type: 'vip' })
    expect(result.map((o) => o.id)).toEqual([1, 3, 2])
  })
})

describe('insertNormalOrder', () => {
  it('appends Normal order to end of queue', () => {
    const pending: Order[] = [{ id: 1, type: 'vip' }]
    const result = insertNormalOrder(pending, { id: 2, type: 'normal' })
    expect(result.map((o) => o.id)).toEqual([1, 2])
  })
})

describe('restoreOrder', () => {
  it('maintains VIP before Normal priority', () => {
    const pending: Order[] = [{ id: 3, type: 'vip' }]
    const result = restoreOrder(pending, { id: 1, type: 'normal' })
    expect(result.map((o) => o.id)).toEqual([3, 1])
  })

  it('maintains creation order among same type', () => {
    const pending: Order[] = [{ id: 2, type: 'vip' }]
    const result = restoreOrder(pending, { id: 1, type: 'vip' })
    expect(result.map((o) => o.id)).toEqual([1, 2])
  })
})
