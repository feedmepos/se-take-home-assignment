'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from '@/presentation/styles/global-style';
import { theme } from '@/presentation/styles/theme';
import { OrderController } from './modules';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <OrderController.OrderControllerProvider>
        {children}
      </OrderController.OrderControllerProvider>
    </ThemeProvider>
  );
}
