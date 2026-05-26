import type { Order, Bot } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error || `HTTP ${res.status}`;
    console.error(`[API] ${options?.method || 'GET'} ${url} failed:`, { status: res.status, message });
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function createOrder(type: 'VIP' | 'NORMAL'): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
}

export async function getOrders(): Promise<Order[]> {
  return request<Order[]>('/api/orders');
}

export async function addBot(): Promise<Bot> {
  return request<Bot>('/api/bots', { method: 'POST' });
}

export async function removeBot(): Promise<void> {
  return request<void>('/api/bots', { method: 'DELETE' });
}

export async function getBots(): Promise<Bot[]> {
  return request<Bot[]>('/api/bots');
}
