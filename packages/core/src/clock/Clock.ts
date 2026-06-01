/** 取消一个已安排的定时器。 */
export type CancelHandle = () => void;

/**
 * 时间抽象。生产环境用真实时钟(真实 10 秒),
 * 测试环境用可手动推进的虚拟时钟,使「10 秒处理」可瞬时、确定地验证。
 */
export interface Clock {
  /** 当前时间戳(毫秒)。 */
  now(): number;
  /** 安排一个回调在 ms 毫秒后执行,返回取消句柄。 */
  setTimeout(fn: () => void, ms: number): CancelHandle;
}
