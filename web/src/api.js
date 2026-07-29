async function request(url, options = {}) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'request failed')
  }
  return data
}

export function fetchState() {
  return request('/api/state')
}

export function createNormalOrder() {
  return request('/api/orders/normal', { method: 'POST' })
}

export function createVIPOrder() {
  return request('/api/orders/vip', { method: 'POST' })
}

export function addBot() {
  return request('/api/bots', { method: 'POST' })
}

export function removeBot() {
  return request('/api/bots', { method: 'DELETE' })
}
