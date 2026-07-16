import styled from 'styled-components';

export const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(4.5)};
  background: ${({ theme }) => theme.color.surface};
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.chunk};
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

export const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

export const GroupLabel = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textMuted};
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

export const Divider = styled.span`
  align-self: stretch;
  width: 1px;
  background: ${({ theme }) => theme.color.border};

  @media (max-width: 640px) {
    display: none;
  }
`;

export const BotCount = styled.span`
  min-width: 28px;
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
  text-align: center;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text};
`;
