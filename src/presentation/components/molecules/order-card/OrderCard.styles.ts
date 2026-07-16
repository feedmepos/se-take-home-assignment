import styled, { keyframes } from 'styled-components';

/** Springy pop as a new ticket lands on the board. */
const popIn = keyframes`
  0%   { opacity: 0; transform: scale(0.86) rotate(-2deg) translateY(6px); }
  60%  { opacity: 1; transform: scale(1.03) rotate(0.4deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`;

export const Card = styled.article<{ $vip: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(3.5)}`};
  background: ${({ theme }) => theme.color.surface};
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.card};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  transform-origin: center;
  animation: ${popIn} 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition:
    transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 120ms ease;

  /* The gold notch that marks a VIP ticket, like a torn raffle stub. */
  &::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 50%;
    width: 10px;
    height: 34px;
    transform: translateY(-50%);
    border-radius: 0 8px 8px 0;
    background: ${({ theme, $vip }) =>
      $vip ? theme.color.vip : 'transparent'};
  }

  &:hover {
    transform: translate(-2px, -2px) rotate(-0.5deg);
    box-shadow: ${({ theme }) => theme.shadow.popLg};
  }
`;

export const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};
  padding-left: ${({ theme }) => theme.space(1)};
`;

export const OrderNumber = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text};
`;
