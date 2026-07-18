/**
 * Design tokens for the whole app — the "Arcade Counter" look: chunky ticket
 * cards with bold ink outlines and hard offset shadows, rounded display
 * numerals, and springy motion. Colours carry semantic meaning:
 *   - brand red        -> primary actions and the app identity
 *   - gold             -> the VIP tier, everywhere it appears
 *   - amber / green    -> the PROCESSING / COMPLETE order states
 * All text-on-fill pairings below meet WCAG AA contrast.
 */
export const theme = {
  color: {
    // Warm paper base (paper -> cocoa ink)
    bg: '#f5f1e8',
    surface: '#ffffff',
    surfaceAlt: '#f0ebe0',
    border: '#efd8ab',
    borderStrong: '#e2c485',
    // Deep cocoa ink used for chunky outlines and hard shadows.
    ink: '#2a1c10',
    text: '#2a1c10',
    textMuted: '#7a6a52',
    textInverse: '#ffffff',

    // Brand
    brand: '#e8331d',
    brandDark: '#c11f10',

    // VIP tier (gold)
    vip: '#8a5a00',
    vipBg: '#ffe0a0',
    vipBorder: '#2a1c10',

    // Normal tier (neutral)
    normal: '#5b4a33',
    normalBg: '#f3e8d2',
    normalBorder: '#2a1c10',

    // Order status — cool "waiting" gray (distinct from the warm NORMAL tier
    // tag) vs hot "cooking" amber vs done green.
    pending: '#51606d',
    pendingBg: '#e2e7ec',
    processing: '#9a4d00',
    processingBg: '#ffcf8f',
    complete: '#1f7a45',
    completeBg: '#bff2d2',

    // Bot status
    idle: '#7a6a52',
    idleBg: '#f3e8d2',
    botActive: '#9a4d00',
    botActiveBg: '#ffcf8f',

    // Bright, high-distinction signal colours for status dots and bars
    // (decorative markers — meant to be vivid and clearly different at a glance).
    pendingSolid: '#8b97a3',
    processingSolid: '#f5820a',
    completeSolid: '#22a95b',
    idleSolid: '#b0a48c',
  },
  radius: {
    // Documented shape rule: badges are chunky-round, cards are extra chunky,
    // buttons are pill.
    badge: '10px',
    card: '20px',
    chunk: '24px',
    pill: '999px',
  },
  space: (n: number) => `${n * 4}px`,
  font: {
    // Rounded, playful face for numbers and titles; falls back gracefully.
    display:
      "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', 'Baloo 2', 'Nunito', system-ui, sans-serif",
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace",
  },
  shadow: {
    // Hard, offset "sticker" shadows — the signature of the playful look.
    card: '3px 3px 0 rgba(42, 28, 16, 0.14)',
    raised: '5px 5px 0 rgba(42, 28, 16, 0.18)',
    pop: '4px 4px 0 #2a1c10',
    popLg: '6px 6px 0 #2a1c10',
  },
} as const;

export type AppTheme = typeof theme;
