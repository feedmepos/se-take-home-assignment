import type { ReactNode } from 'react';
import { StyledBadge, type BadgeTone } from './Badge.styles';

// Re-export the tone type so consumers can import it alongside the component.
export type { BadgeTone } from './Badge.styles';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <StyledBadge $tone={tone}>{children}</StyledBadge>;
}
