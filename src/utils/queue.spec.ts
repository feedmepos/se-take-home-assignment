import { describe, expect, it } from 'vitest'
import type { Order, OrderType } from '@/store/types'
import { insertByPriority } from './queue'

function makeOrder(id: number, type: OrderType): Order {
  return { id, type, status: 'PENDING', createdAt: 0 }
}

function ids(list: Order[]): string {
  return list.map(o => `${o.type[0]}${o.id}`).join(',')
}

describe('insertByPriority', () => {
  it('inserts into empty queue', () => {
    const q: Order[] = []
    insertByPriority(q, makeOrder(1, 'NORMAL'))
    expect(ids(q)).toBe('N1')
  })

  it('appends NORMAL after existing NORMALs (R1)', () => {
    const q = [makeOrder(1, 'NORMAL'), makeOrder(2, 'NORMAL')]
    insertByPriority(q, makeOrder(3, 'NORMAL'))
    expect(ids(q)).toBe('N1,N2,N3')
  })

  it('places new VIP before NORMALs but after existing VIPs (R2)', () => {
    // pending starts sorted: V2 already jumped ahead of N1
    const q = [makeOrder(2, 'VIP'), makeOrder(1, 'NORMAL'), makeOrder(3, 'NORMAL')]
    insertByPriority(q, makeOrder(4, 'VIP'))
    expect(ids(q)).toBe('V2,V4,N1,N3')
  })

  it('inserts VIP into all-NORMAL queue at the front', () => {
    const q = [makeOrder(1, 'NORMAL'), makeOrder(2, 'NORMAL')]
    insertByPriority(q, makeOrder(3, 'VIP'))
    expect(ids(q)).toBe('V3,N1,N2')
  })

  it('appends VIP at end of all-VIP queue', () => {
    const q = [makeOrder(1, 'VIP'), makeOrder(2, 'VIP')]
    insertByPriority(q, makeOrder(3, 'VIP'))
    expect(ids(q)).toBe('V1,V2,V3')
  })

  it('returns VIP to its original VIP-group position by id (R6)', () => {
    const q = [makeOrder(2, 'VIP'), makeOrder(3, 'VIP'), makeOrder(4, 'NORMAL')]
    insertByPriority(q, makeOrder(1, 'VIP'))
    expect(ids(q)).toBe('V1,V2,V3,N4')
  })

  it('returns NORMAL to its original NORMAL-group position by id (R6)', () => {
    const q = [makeOrder(2, 'VIP'), makeOrder(3, 'NORMAL')]
    insertByPriority(q, makeOrder(1, 'NORMAL'))
    expect(ids(q)).toBe('V2,N1,N3')
  })

  it('returned VIP never crosses into front of an older VIP', () => {
    const q = [makeOrder(2, 'VIP'), makeOrder(4, 'VIP')]
    insertByPriority(q, makeOrder(3, 'VIP'))
    expect(ids(q)).toBe('V2,V3,V4')
  })
})
