import { useEffect, useState } from 'react';

/** 返回随时间推进的当前时间戳,用于驱动处理进度动画。 */
export function useNow(intervalMs = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
