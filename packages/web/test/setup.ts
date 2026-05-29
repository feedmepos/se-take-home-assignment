import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;

  closed = false;

  onerror: (() => void) | null = null;

  private listeners = new Map<string, ((event: MessageEvent) => void)[]>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  close() {
    this.closed = true;
  }

  triggerError() {
    this.onerror?.();
  }

  emit(type: string, data: unknown) {
    if (this.closed) {
      return;
    }
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data: JSON.stringify(data) }));
    }
  }
}

Object.defineProperty(globalThis, "EventSource", {
  configurable: true,
  writable: true,
  value: MockEventSource,
});

Object.defineProperty(globalThis, "__mockEventSource", {
  configurable: true,
  writable: true,
  value: MockEventSource,
});

beforeEach(() => {
  MockEventSource.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});
