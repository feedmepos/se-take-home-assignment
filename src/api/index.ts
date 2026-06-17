import { get, post } from './request'

/** 示例 */
export function example(params?: Record<string, unknown>) {
  return post('xxx', params)
}

/** 获取用户, 仅支持 get */
export function getRandomUser() {
  return get('https://randomuser.me/api/')
}
