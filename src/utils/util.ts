import { useCallback } from 'react';
// 添加防抖函数
export const useDebounce = (func: (...args: any[]) => void, delay: number = 300) => {
    return useCallback(
      (...args: any[]) => {
        const handler = setTimeout(() => func(...args), delay);
        return () => clearTimeout(handler);
      },
      [func, delay]
    );
};