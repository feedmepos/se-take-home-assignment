import type { ApiResponse, OrderResponse, BotResponse, SystemStatus } from '../types'

const BASE = '/api/v1'

/** 通用请求方法 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

/** 创建普通订单 */
export function createNormalOrder(): Promise<ApiResponse<OrderResponse>> {
  return request(`${BASE}/orders/normal`, { method: 'POST' })
}

/** 创建 VIP 订单 */
export function createVipOrder(): Promise<ApiResponse<OrderResponse>> {
  return request(`${BASE}/orders/vip`, { method: 'POST' })
}

/** 获取所有订单 */
export function getOrders(): Promise<ApiResponse<OrderResponse[]>> {
  return request(`${BASE}/orders`)
}

/** 添加 Bot */
export function addBot(): Promise<ApiResponse<BotResponse>> {
  return request(`${BASE}/bots`, { method: 'POST' })
}

/** 移除 Bot */
export function removeBot(): Promise<ApiResponse<null>> {
  return request(`${BASE}/bots`, { method: 'DELETE' })
}

/** 获取系统状态 */
export function getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
  return request(`${BASE}/status`)
}

/** 重置系统（清空所有数据） */
export function resetSystem(): Promise<ApiResponse<null>> {
  return request(`${BASE}/reset`, { method: 'DELETE' })
}

/** 构建 WebSocket 地址 */
export function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/events`
}
