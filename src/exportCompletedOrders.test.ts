import { describe, expect, it } from 'vitest'
import {
  buildCompletedOrderExportRows,
  completedOrderExportHeaders,
  createCompletedOrdersWorkbook,
  formatExportDateTime
} from './exportCompletedOrders'
import type { Order } from './orderController'

describe('completed order export', () => {
  it('sorts completed orders by order id and maps the requested fields', () => {
    const rows = buildCompletedOrderExportRows([
      makeCompletedOrder({ id: 3, type: 'NORMAL', cookingBotId: 2, cancelCount: 1 }),
      makeCompletedOrder({ id: 1, type: 'VIP', cookingBotId: 1, cancelCount: 0 })
    ])

    expect(rows).toEqual([
      {
        订单号: 1,
        级别: 'VIP',
        制作机器: 'Bot 1',
        取消次数: 0,
        下单时间: '2026-06-12 08:00:01',
        制作时间: '2026-06-12 08:00:02',
        完成时间: '2026-06-12 08:00:12'
      },
      {
        订单号: 3,
        级别: 'NORMAL',
        制作机器: 'Bot 2',
        取消次数: 1,
        下单时间: '2026-06-12 08:00:03',
        制作时间: '2026-06-12 08:00:04',
        完成时间: '2026-06-12 08:00:14'
      }
    ])
  })

  it('creates a workbook with headers and autofilter enabled', () => {
    const workbook = createCompletedOrdersWorkbook([
      makeCompletedOrder({ id: 2, type: 'NORMAL', cookingBotId: 4, cancelCount: 2 })
    ])
    const worksheet = workbook.Sheets['Completed Orders']

    expect(workbook.SheetNames).toEqual(['Completed Orders'])
    expect(completedOrderExportHeaders.map((_, index) => worksheet[String.fromCharCode(65 + index) + '1'].v)).toEqual(
      completedOrderExportHeaders
    )
    expect(worksheet['!autofilter']).toEqual({ ref: 'A1:G2' })
  })

  it('formats empty timestamps as blank cells', () => {
    expect(formatExportDateTime(null)).toBe('')
  })
})

function makeCompletedOrder(overrides: Partial<Order>): Order {
  const id = overrides.id ?? 1

  return {
    id,
    type: overrides.type ?? 'NORMAL',
    status: 'COMPLETE',
    createdAt: new Date(2026, 5, 12, 8, 0, id).getTime(),
    cookingStartedAt: new Date(2026, 5, 12, 8, 0, id + 1).getTime(),
    completedAt: new Date(2026, 5, 12, 8, 0, id + 11).getTime(),
    cookingBotId: overrides.cookingBotId ?? 1,
    cancelCount: overrides.cancelCount ?? 0
  }
}
