import type { DomainEvent, SystemSnapshot } from "@feedme/core";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function readSnapshot(response: Response): Promise<SystemSnapshot> {
  const payload = (await response.json()) as { snapshot: SystemSnapshot };
  return payload.snapshot;
}

export async function getState(): Promise<SystemSnapshot> {
  const response = await fetch(`${API_BASE_URL}/state`);
  if (!response.ok) {
    throw new Error("Failed to fetch state.");
  }
  return readSnapshot(response);
}

export async function postOrder(priority: "normal" | "vip"): Promise<SystemSnapshot> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ priority }),
  });
  if (!response.ok) {
    throw new Error("Failed to create order.");
  }
  return readSnapshot(response);
}

export async function addBot(): Promise<SystemSnapshot> {
  const response = await fetch(`${API_BASE_URL}/bots`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to add bot.");
  }
  return readSnapshot(response);
}

export async function removeLatestBot(): Promise<SystemSnapshot> {
  const response = await fetch(`${API_BASE_URL}/bots/latest`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to remove bot." }))) as { error?: string };
    throw new Error(payload.error ?? "Failed to remove bot.");
  }
  return readSnapshot(response);
}

export async function removeBot(botId: number): Promise<SystemSnapshot> {
  const response = await fetch(`${API_BASE_URL}/bots/${botId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to remove bot." }))) as { error?: string };
    throw new Error(payload.error ?? "Failed to remove bot.");
  }
  return readSnapshot(response);
}

export function createEventSource(onEvent: (event: DomainEvent) => void): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/events`);
  const handler = (messageEvent: MessageEvent) => {
    onEvent(JSON.parse(messageEvent.data) as DomainEvent);
  };

  eventSource.addEventListener("order.created", handler as EventListener);
  eventSource.addEventListener("order.assigned", handler as EventListener);
  eventSource.addEventListener("order.completed", handler as EventListener);
  eventSource.addEventListener("order.requeued", handler as EventListener);
  eventSource.addEventListener("bot.added", handler as EventListener);
  eventSource.addEventListener("bot.removed", handler as EventListener);
  eventSource.addEventListener("bot.idle", handler as EventListener);
  return eventSource;
}
