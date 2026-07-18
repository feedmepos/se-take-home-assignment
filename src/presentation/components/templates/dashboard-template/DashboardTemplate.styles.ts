import styled from 'styled-components';

export const Page = styled.div`
  max-width: 1200px;
  /* Desktop: pin the board to the viewport so the lanes get a bounded height
     and scroll internally. Mobile falls back to natural height + page scroll. */
  height: 100vh;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space(8)} ${theme.space(5)}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};

  @media (max-width: 980px) {
    height: auto;
    min-height: 100vh;
  }
`;

export const Masthead = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(4)};
`;

export const Logo = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: 2px solid ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radius.badge};
  background: ${({ theme }) => theme.color.vip};
  box-shadow: ${({ theme }) => theme.shadow.pop};
  color: ${({ theme }) => theme.color.textInverse};
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  font-weight: 800;
  transform: rotate(-4deg);
  transition: transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: rotate(4deg) scale(1.05);
  }
`;

export const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
`;

export const Title = styled.h1`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

export const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textMuted};
`;

export const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(5)};
  align-items: stretch;
  /* Desktop: fill the remaining viewport height. min-height:0 lets this flex
     child be bounded (instead of growing to fit all cards) so each lane's list
     scrolls internally. */
  flex: 1;
  min-height: 0;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    /* Mobile: stacked lanes keep a fixed height each, so adding an order
       scrolls the lane instead of pushing the rest of the page down. */
    flex: none;
    grid-auto-rows: 340px;
  }
`;
