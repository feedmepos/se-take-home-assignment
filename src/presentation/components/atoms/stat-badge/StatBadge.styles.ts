import styled from 'styled-components';

export const StyledStatBadge = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2.5)}`};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  border: 2px solid ${({ theme }) => theme.color.ink};
`;

export const Value = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text};
`;

export const Label = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textMuted};
`;
