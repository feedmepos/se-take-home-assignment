/** 由 HTTP base 推导 WebSocket 地址(http→ws,https→wss,路径 /ws)。 */
export function deriveWsUrl(httpBase: string): string {
  const url = new URL(httpBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

export const config = {
  apiBase,
  wsUrl: import.meta.env.VITE_WS_URL ?? deriveWsUrl(apiBase),
};
