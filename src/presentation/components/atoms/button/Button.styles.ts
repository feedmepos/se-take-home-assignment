import styled, { css } from 'styled-components';

export type ButtonVariant = 'primary' | 'vip' | 'neutral' | 'ghost';

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.textInverse};
    &:hover:not(:disabled) {
      background: #3f2c1a;
    }
  `,
  vip: css`
    background: ${({ theme }) => theme.color.vipBg};
    color: ${({ theme }) => theme.color.vip};
    &:hover:not(:disabled) {
      filter: brightness(0.97);
    }
  `,
  neutral: css`
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceAlt};
    }
  `,
  ghost: css`
    background: ${({ theme }) => theme.color.surfaceAlt};
    color: ${({ theme }) => theme.color.text};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surface};
    }
  `,
} as const;

export const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(4.5)}`};
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.pill};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  font-family: ${({ theme }) => theme.font.display};
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 90ms ease,
    background 140ms ease,
    filter 140ms ease;

  ${({ $variant }) => variantStyles[$variant]}

  &:hover:not(:disabled) {
    transform: translate(-1px, -1px);
    box-shadow: ${({ theme }) => theme.shadow.popLg};
  }

  &:active:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 ${({ theme }) => theme.color.ink};
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.brand};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: ${({ theme }) => theme.shadow.card};
  }
`;
