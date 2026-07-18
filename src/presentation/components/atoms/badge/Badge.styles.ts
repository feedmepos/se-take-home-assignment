import styled from 'styled-components';
import type { AppTheme } from '@/presentation/styles/theme';

export type BadgeTone =
  | 'neutral'
  | 'vip'
  | 'pending'
  | 'processing'
  | 'complete'
  | 'idle'
  | 'active';

const toneColors = (
  theme: AppTheme,
): Record<BadgeTone, { bg: string; fg: string; border: string }> => ({
  neutral: {
    bg: theme.color.normalBg,
    fg: theme.color.normal,
    border: theme.color.normalBorder,
  },
  vip: {
    bg: theme.color.vipBg,
    fg: theme.color.vip,
    border: theme.color.vipBorder,
  },
  pending: {
    bg: theme.color.pendingBg,
    fg: theme.color.pending,
    border: theme.color.pendingBg,
  },
  processing: {
    bg: theme.color.processingBg,
    fg: theme.color.processing,
    border: theme.color.processingBg,
  },
  complete: {
    bg: theme.color.completeBg,
    fg: theme.color.complete,
    border: theme.color.completeBg,
  },
  idle: {
    bg: theme.color.idleBg,
    fg: theme.color.idle,
    border: theme.color.idleBg,
  },
  active: {
    bg: theme.color.botActiveBg,
    fg: theme.color.botActive,
    border: theme.color.botActiveBg,
  },
});

export const StyledBadge = styled.span<{ $tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2.5)}`};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 2px solid ${({ theme }) => theme.color.ink};
  background: ${({ theme, $tone }) => toneColors(theme)[$tone].bg};
  color: ${({ theme, $tone }) => toneColors(theme)[$tone].fg};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
`;
