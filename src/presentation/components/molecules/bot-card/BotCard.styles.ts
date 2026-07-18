import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
`;

/** Gentle wobble on the bot's face while it's cooking. */
const wobble = keyframes`
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
`;

/** Barber-pole sweep for the indeterminate cooking bar. */
const sweep = keyframes`
  from { background-position: 0 0; }
  to { background-position: 28px 0; }
`;

export const Card = styled.article<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};
  min-width: 200px;
  padding: ${({ theme }) => theme.space(3.5)};
  background: ${({ theme }) => theme.color.surface};
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.card};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  transition:
    transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 120ms ease;

  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: ${({ theme }) => theme.shadow.popLg};
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
`;

export const Identity = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

export const Face = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.badge};
  background: ${({ theme }) => theme.color.surface};
  font-size: 15px;
  line-height: 1;
  transform-origin: 50% 60%;
  animation: ${({ $active }) => ($active ? wobble : 'none')} 0.9s ease-in-out
    infinite;
`;

export const Badges = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
`;

export const BotName = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.text};
`;

export const Dot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $active }) =>
    $active ? theme.color.processingSolid : theme.color.idleSolid};
  animation: ${({ $active }) => ($active ? pulse : 'none')} 1.1s ease-in-out
    infinite;
`;

export const Task = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};

  strong {
    color: ${({ theme }) => theme.color.text};
    font-variant-numeric: tabular-nums;
  }
`;

/** Indeterminate progress bar shown while a bot is cooking. */
export const CookBar = styled.span`
  display: block;
  height: 8px;
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.pill};
  background-image: repeating-linear-gradient(
    -45deg,
    ${({ theme }) => theme.color.processingSolid} 0 7px,
    #ffcf85 7px 14px
  );
  background-size: 28px 100%;
  animation: ${sweep} 0.6s linear infinite;
`;
