import { css } from 'styled-components';

/**
 * Shared scroll styling for the board lanes so every lane looks identical on
 * desktop: a thin, on-theme scrollbar with a reserved gutter (`stable`), so the
 * content width doesn't jump when a lane starts overflowing.
 */
export const scrollable = css`
  overflow-y: auto;
  scrollbar-gutter: stable;

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.textMuted} transparent;

  /* WebKit (Chrome / Safari / Edge) */
  &::-webkit-scrollbar {
    width: 12px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.textMuted};
    border-radius: ${({ theme }) => theme.radius.pill};
    /* Inset the thumb so it reads as a slim pill, not a full-width bar. */
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.color.ink};
    background-clip: padding-box;
  }
`;
