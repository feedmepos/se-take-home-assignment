import styled from 'styled-components';
import { scrollable } from '@/presentation/styles/scrollable';

export const Shelf = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.chunk};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  overflow: hidden;
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(3.5)} ${theme.space(4)}`};
  border-bottom: 2px solid ${({ theme }) => theme.color.ink};
  background: ${({ theme }) => theme.color.surface};
`;

export const Title = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-family: ${({ theme }) => theme.font.display};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.text};
`;

export const Accent = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.processingSolid};
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)};
  flex: 1;
  min-height: 0;
  ${scrollable}
`;

export const Empty = styled.p`
  margin: ${({ theme }) => theme.space(6)} 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;
