import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000';

type OrderSummary = { id: number; status: string };

async function getOrders(request: APIRequestContext): Promise<OrderSummary[]> {
  const response = await request.get(`${API_BASE}/api/orders`);
  return response.json();
}

export async function removeAllBots(request: APIRequestContext): Promise<void> {
  let bots: unknown[] = await (await request.get(`${API_BASE}/api/bots`)).json();
  while (bots.length > 0) {
    await request.delete(`${API_BASE}/api/bots`);
    bots = await (await request.get(`${API_BASE}/api/bots`)).json();
  }
}

/** 用现有 API 处理并清掉所有未完成的订单，避免用例间共享状态干扰 */
export async function clearPendingOrders(request: APIRequestContext): Promise<void> {
  await removeAllBots(request);

  let pending = (await getOrders(request)).filter((o) => o.status !== 'COMPLETE');
  while (pending.length > 0) {
    for (let i = 0; i < pending.length; i++) {
      await request.post(`${API_BASE}/api/bots`);
    }
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    await removeAllBots(request);
    pending = (await getOrders(request)).filter((o) => o.status !== 'COMPLETE');
  }
}

export async function waitForOrderStatus(
  request: APIRequestContext,
  orderId: number,
  status: string,
  timeout = 20_000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const orders = await getOrders(request);
        return orders.find((o) => o.id === orderId)?.status;
      },
      { timeout },
    )
    .toBe(status);
}

export async function createOrderViaUi(
  page: Page,
  type: 'NORMAL' | 'VIP',
): Promise<number> {
  const label = type === 'NORMAL' ? 'New Normal Order' : 'New VIP Order';
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/orders') &&
        resp.request().method() === 'POST' &&
        resp.status() === 201,
    ),
    page.click(`text=${label}`),
  ]);
  const order = await response.json();
  return order.id as number;
}
