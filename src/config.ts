import { DEFAULT_PROCESS_MS } from './domain/orderSystem';

/**
 * Cooking time per order. Defaults to 10s (README req 4) but can be overridden
 * with a `?processMs=` query param so end-to-end tests run fast and reliably.
 */
export function getProcessMs(): number {
  if (typeof window === 'undefined') return DEFAULT_PROCESS_MS;
  const raw = new URLSearchParams(window.location.search).get('processMs');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PROCESS_MS;
}
