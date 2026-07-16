import type { ButtonHTMLAttributes } from 'react';
import { StyledButton, type ButtonVariant } from './Button.styles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'neutral',
  fullWidth = false,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <StyledButton
      type={type}
      $variant={variant}
      $fullWidth={fullWidth}
      {...rest}
    >
      {children}
    </StyledButton>
  );
}
