import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, applyTheme } from '../src/store/useThemeStore';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove('light', 'dark');
  useThemeStore.setState({ theme: 'dark' });
  applyTheme('dark');
});

describe('useThemeStore', () => {
  it('applyTheme toggles the html class and persists to localStorage', () => {
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('feedme-theme')).toBe('light');

    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(window.localStorage.getItem('feedme-theme')).toBe('dark');
  });

  it('toggle flips between dark and light', () => {
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme applies and stores the given theme', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(window.localStorage.getItem('feedme-theme')).toBe('light');
  });
});
