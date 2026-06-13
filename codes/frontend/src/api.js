// Thin client for the Node.js order-controller backend.
// Base URL is configurable via VITE_API_BASE (defaults to localhost:3001).

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export const api = {
  base: BASE,

  /** Open the SSE stream. onState is called with each state snapshot. */
  connect(onState, onError) {
    const source = new EventSource(`${BASE}/api/events`);
    source.onmessage = (e) => {
      try {
        onState(JSON.parse(e.data));
      } catch {
        /* ignore malformed frame */
      }
    };
    source.onerror = (e) => onError && onError(e);
    return source;
  },

  newOrder(type) {
    return fetch(`${BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  },

  addBot() {
    return fetch(`${BASE}/api/bots`, { method: 'POST' });
  },

  removeBot() {
    return fetch(`${BASE}/api/bots`, { method: 'DELETE' });
  },
};
