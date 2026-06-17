import { post } from './request'

/** 示例 */
export function example(params?: Record<string, unknown>) {
  return post('xxx', params)
}

