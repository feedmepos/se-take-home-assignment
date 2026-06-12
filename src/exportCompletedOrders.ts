import * as XLSX from 'xlsx'
import type { Order } from './orderController'

export const completedOrderExportHeaders = [
  '订单号',
  '级别',
  '制作机器',
  '取消次数',
  '下单时间',
  '制作时间',
  '完成时间'
] as const

export type CompletedOrderExportHeader = (typeof completedOrderExportHeaders)[number]
export type CompletedOrderExportRow = Record<CompletedOrderExportHeader, string | number>

export function buildCompletedOrderExportRows(orders: Order[]): CompletedOrderExportRow[] {
  return [...orders]
    .sort((a, b) => a.id - b.id)
    .map((order) => ({
      订单号: order.id,
      级别: order.type,
      制作机器: order.cookingBotId === null ? '' : `Bot ${order.cookingBotId}`,
      取消次数: order.cancelCount,
      下单时间: formatExportDateTime(order.createdAt),
      制作时间: formatExportDateTime(order.cookingStartedAt),
      完成时间: formatExportDateTime(order.completedAt)
    }))
}

export function createCompletedOrdersWorkbook(orders: Order[]): XLSX.WorkBook {
  const rows = buildCompletedOrderExportRows(orders)
  const body = rows.map((row) => completedOrderExportHeaders.map((header) => row[header]))
  const worksheet = XLSX.utils.aoa_to_sheet([[...completedOrderExportHeaders], ...body])
  const rangeRef = `A1:G${Math.max(rows.length + 1, 1)}`

  worksheet['!autofilter'] = { ref: rangeRef }
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Orders')
  return workbook
}

export function exportCompletedOrders(orders: Order[]): void {
  const workbook = createCompletedOrdersWorkbook(orders)
  XLSX.writeFile(workbook, `completed-orders-${formatFileDate(new Date())}.xlsx`, { compression: true })
}

export function formatExportDateTime(timestamp: number | null): string {
  if (timestamp === null) {
    return ''
  }

  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function formatFileDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes()
  )}${pad(date.getSeconds())}`
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}
