/**
 * 基于 fetch 封装的请求方法
 */

type RequestQuery = Record<string, string | number | boolean | null | undefined>

const buildQueryString = (query?: RequestQuery) => {
  if (!query) return ''
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    params.append(key, String(value))
  })

  const text = params.toString()
  return text ? `?${text}` : ''
}

const parseResponse = async (res: Response) => {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const request = async <T>(url: string, init: RequestInit) => {
  const res = await fetch(url, init)
  const data = await parseResponse(res)

  if (!res.ok) {
    throw new Error((data as { message?: string } | null)?.message || `${res.status} ${res.statusText}`)
  }

  return data as T
}

export const get = async <T = unknown>(
  url: string,
  query?: RequestQuery,
  init?: Omit<RequestInit, 'method' | 'body'>,
) => request<T>(`${url}${buildQueryString(query)}`, { ...init, method: 'GET' })

export const post = async <T = unknown>(
  url: string,
  body?: unknown,
  init?: Omit<RequestInit, 'method' | 'body'>,
) =>
  request<T>(url, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify(body || {}),
  })
