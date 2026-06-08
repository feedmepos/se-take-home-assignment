import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'feedme-theme';

/** 读取初始主题:localStorage 优先,其次跟随系统偏好,默认深色。 */
export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
  return prefersLight ? 'light' : 'dark';
}

/** 把主题写到 <html> 的 class 上并持久化(整套 CSS 变量随之翻转)。 */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage 不可用(隐私模式等)时静默降级,仅内存生效
  }
}

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: resolveInitialTheme(),
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

// 模块加载时立即同步一次,确保运行态 class 与 store 一致。
applyTheme(useThemeStore.getState().theme);
