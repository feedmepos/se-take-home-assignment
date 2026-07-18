import { Label, StyledStatBadge, Value } from './StatBadge.styles';

export interface StatBadgeProps {
  label: string;
  value: number | string;
}

export function StatBadge({ label, value }: StatBadgeProps) {
  return (
    <StyledStatBadge>
      <Value>{value}</Value>
      <Label>{label}</Label>
    </StyledStatBadge>
  );
}
